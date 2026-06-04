from __future__ import annotations

import json
import os
import re
from datetime import datetime, timedelta, timezone
from typing import AsyncIterator
from urllib.parse import urlparse
from xml.etree import ElementTree

import httpx
from openai import OpenAI

from .config import PERIOD_MAP, RSS_FEEDS, TRUSTED_DOMAINS, build_topic_context
from .models import DigestPlan, DigestRequest, DigestResult, SourceItem


SYSTEM_PROMPT = """
Ты исследовательский AI-агент MyDigest для компании Империя Форум.
Работай только на русском языке, нейтрально, фактологично и в деловом стиле.
Нужно составлять верифицированный дайджест строго в формате:

## Дайджест: [Тема] — [Период]
_Сформирован: [дата и время]_

---

### Ключевой вывод
[2–3 предложения]

---

### Основные события
- **[Заголовок события]** — [1–2 предложения]

---

### Источники
1. [Название источника] — [URL]

Правила:
- использовать только факты из предоставленного контекста и/или веб-поиска;
- если информация сомнительна, не включать ее;
- отбирать только события в рамках периода;
- в блоке источников указывать минимум 5 и максимум 10 проверенных источников.
""".strip()


class DigestAgent:
    def __init__(self) -> None:
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "")
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o")
        self.enable_web_search = os.getenv("OPENAI_ENABLE_WEB_SEARCH", "true").lower() == "true"
        self.telegram_bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
        self.telegram_api_url = os.getenv("TELEGRAM_API_URL", "https://api.telegram.org")

    def _client(self) -> OpenAI:
        if not self.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is not set")
        return OpenAI(api_key=self.openai_api_key)

    def build_plan(self, request: DigestRequest) -> DigestPlan:
        context = build_topic_context(request.topic)
        period = PERIOD_MAP[request.period]
        trusted_domains = [
            *TRUSTED_DOMAINS["general"],
            *TRUSTED_DOMAINS.get(context.domain_bucket, []),
        ]
        queries = [
            f"{request.topic} новости {period['label']}",
            f"{request.topic} регулирование {period['label']}",
            f"{request.topic} рынок {period['label']}",
        ]
        if request.comment:
            queries.append(request.comment)

        return DigestPlan(
            topic_label=request.topic,
            period_label=period["label"],
            search_goal=f"{request.division}: {request.topic}. Учесть комментарий: {request.comment or 'нет'}",
            trusted_domains=list(dict.fromkeys(trusted_domains)),
            rss_feeds=RSS_FEEDS["general"],
            telegram_channels=context.telegram_channels,
            queries=queries,
        )

    async def collect_rss(self, plan: DigestPlan, period_days: int) -> list[SourceItem]:
        cutoff = datetime.now(timezone.utc) - timedelta(days=period_days)
        items: list[SourceItem] = []
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            for feed_url in plan.rss_feeds:
                try:
                    response = await client.get(feed_url)
                    response.raise_for_status()
                    root = ElementTree.fromstring(response.text)
                except Exception:
                    continue

                for node in root.findall(".//item")[:20]:
                    title = (node.findtext("title") or "").strip()
                    link = (node.findtext("link") or "").strip()
                    description = re.sub(r"<[^>]+>", " ", node.findtext("description") or "")
                    pub_date_raw = (node.findtext("pubDate") or "").strip()
                    published_at = self._parse_pub_date(pub_date_raw)

                    if published_at and published_at < cutoff:
                        continue
                    if not self._matches_topic(title, description, plan):
                        continue
                    if not link:
                        continue

                    items.append(
                        SourceItem(
                            title=title,
                            url=link,
                            snippet=" ".join(description.split())[:320],
                            published_at=published_at,
                            source_name=urlparse(link).netloc,
                            source_type="rss",
                            trusted=self._is_trusted(link, plan),
                        )
                    )
        return items

    async def collect_telegram(self, plan: DigestPlan, period_days: int) -> list[SourceItem]:
        if not self.telegram_bot_token or not plan.telegram_channels:
            return []

        cutoff = datetime.now(timezone.utc) - timedelta(days=period_days)
        items: list[SourceItem] = []
        async with httpx.AsyncClient(timeout=20.0) as client:
            for channel in plan.telegram_channels[:5]:
                url = f"{self.telegram_api_url}/bot{self.telegram_bot_token}/getChat"
                try:
                    response = await client.get(url, params={"chat_id": f"@{channel}"})
                    response.raise_for_status()
                    payload = response.json()
                except Exception:
                    continue

                if not payload.get("ok"):
                    continue

                title = payload["result"].get("title") or channel
                bio = payload["result"].get("description") or ""
                if not self._matches_topic(title, bio, plan):
                    continue
                items.append(
                    SourceItem(
                        title=f"Telegram-канал: {title}",
                        url=f"https://t.me/{channel}",
                        snippet=bio[:280],
                        published_at=cutoff,
                        source_name="Telegram",
                        source_type="telegram",
                        trusted=True,
                    )
                )
        return items

    def collect_web_with_openai(self, plan: DigestPlan) -> list[SourceItem]:
        if not self.enable_web_search:
            return []

        client = self._client()
        query = (
            f"Собери проверенные новости по теме '{plan.topic_label}' за период '{plan.period_label}'. "
            f"Нужны факты, события, решения регуляторов и рыночные сигналы. "
            "Верни краткий обзор с опорой на надежные источники."
        )
        response = client.responses.create(
            model=self.model,
            input=query,
            tools=[
                {
                    "type": "web_search",
                    "filters": {"allowed_domains": plan.trusted_domains},
                }
            ],
            tool_choice="auto",
            include=["web_search_call.action.sources"],
        )

        raw_sources: list[dict] = []
        for item in getattr(response, "output", []) or []:
            if getattr(item, "type", "") == "web_search_call":
                action = getattr(item, "action", None)
                if action and getattr(action, "sources", None):
                    raw_sources.extend(action.sources)

        sources: list[SourceItem] = []
        seen: set[str] = set()
        for source in raw_sources:
            url = source.get("url") or ""
            if not url or url in seen:
                continue
            seen.add(url)
            title = source.get("title") or urlparse(url).netloc
            sources.append(
                SourceItem(
                    title=title,
                    url=url,
                    source_name=urlparse(url).netloc,
                    source_type="web",
                    trusted=self._is_trusted(url, plan),
                )
            )
        return sources

    def filter_sources(self, plan: DigestPlan, sources: list[SourceItem], limit: int = 12) -> list[SourceItem]:
        unique: dict[str, SourceItem] = {}
        for source in sources:
            if not source.url or not source.trusted:
                continue
            unique.setdefault(source.url, source)

        ranked = sorted(
            unique.values(),
            key=lambda item: (
                0 if self._is_trusted(item.url, plan) else 1,
                item.published_at or datetime.min.replace(tzinfo=timezone.utc),
            ),
            reverse=True,
        )
        return ranked[:limit]

    def generate_digest(self, request: DigestRequest, plan: DigestPlan, sources: list[SourceItem]) -> DigestResult:
        client = self._client()
        serialized_sources = [
            {
                "title": item.title,
                "url": item.url,
                "snippet": item.snippet,
                "source_name": item.source_name,
                "source_type": item.source_type,
                "published_at": item.published_at.isoformat() if item.published_at else "",
            }
            for item in sources
        ]
        prompt = f"""
Собери финальный дайджест для сотрудника компании Империя Форум.

Подразделение: {request.division}
Тематика: {request.topic}
Период: {plan.period_label}
Комментарий: {request.comment or "нет"}

Контекст по источникам:
{json.dumps(serialized_sources, ensure_ascii=False, indent=2)}

Если источников недостаточно для уверенного вывода, честно сузь вывод до доступных фактов, но структуру сохрани.
""".strip()

        response = client.responses.create(
            model=self.model,
            input=prompt,
            instructions=SYSTEM_PROMPT,
        )
        markdown = getattr(response, "output_text", "").strip()
        return DigestResult(markdown=markdown, sources=sources)

    async def run(self, request: DigestRequest) -> AsyncIterator[dict]:
        period_days = PERIOD_MAP[request.period]["days"]
        plan = self.build_plan(request)
        yield {
            "type": "stage",
            "stage": "PLAN",
            "message": "Определяю стратегию поиска, список надежных доменов и дополнительные источники.",
            "meta": plan.model_dump(),
        }

        rss_sources = await self.collect_rss(plan, period_days)
        telegram_sources = await self.collect_telegram(plan, period_days)
        web_sources = self.collect_web_with_openai(plan)
        found_sources = [*rss_sources, *telegram_sources, *web_sources]
        yield {
            "type": "stage",
            "stage": "SEARCH",
            "message": f"Собрано {len(found_sources)} кандидатов из веба, RSS и Telegram.",
            "meta": {"counts": {"rss": len(rss_sources), "telegram": len(telegram_sources), "web": len(web_sources)}},
        }

        filtered_sources = self.filter_sources(plan, found_sources)
        yield {
            "type": "stage",
            "stage": "FILTER",
            "message": f"После дедупликации и верификации оставлено {len(filtered_sources)} источников.",
            "meta": {"sources": [item.model_dump(mode="json") for item in filtered_sources]},
        }

        if len(filtered_sources) < 5:
            raise RuntimeError(
                "Недостаточно проверенных источников. Подключите OPENAI web search и/или Telegram API."
            )

        yield {
            "type": "stage",
            "stage": "ANALYZE",
            "message": "Формирую ключевой вывод и структурирую основные события.",
        }
        digest = self.generate_digest(request, plan, filtered_sources[:10])

        yield {
            "type": "stage",
            "stage": "VERIFY",
            "message": "Проверяю, что в финальном выводе остаются только подтвержденные источники.",
            "meta": {"source_count": len(digest.sources[:10])},
        }

        yield {
            "type": "result",
            "stage": "OUTPUT",
            "message": "Дайджест готов.",
            "digest": digest.markdown,
            "sources": [item.model_dump(mode="json") for item in digest.sources[:10]],
        }

    def _is_trusted(self, url: str, plan: DigestPlan) -> bool:
        domain = urlparse(url).netloc.lower()
        return any(domain.endswith(allowed) for allowed in plan.trusted_domains)

    def _matches_topic(self, title: str, description: str, plan: DigestPlan) -> bool:
        haystack = f"{title} {description}".lower()
        tokens = [token.lower() for token in plan.queries + [plan.topic_label]]
        return any(token in haystack for token in tokens if len(token) > 2)

    @staticmethod
    def _parse_pub_date(value: str) -> datetime | None:
        if not value:
            return None
        known_formats = [
            "%a, %d %b %Y %H:%M:%S %z",
            "%a, %d %b %Y %H:%M:%S %Z",
        ]
        for fmt in known_formats:
            try:
                return datetime.strptime(value, fmt).astimezone(timezone.utc)
            except ValueError:
                continue
        return None
