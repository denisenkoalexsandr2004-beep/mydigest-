from __future__ import annotations

from dataclasses import dataclass
from typing import Any


APP_TITLE = "MyDigest — Империя Форум"


TOPIC_MAP: dict[str, list[str]] = {
    "Выставки": [
        "Фуд",
        "Нон-фуд (Питерфуд, Нева Байерсвик)",
    ],
    "Центры закупок": [
        "Фуд",
        "Нон-фуд",
        "FMCG",
        "E-commerce",
        "DIY и стройматериалы",
        "Электроника",
        "Бытовая техника",
        "Красота и косметика",
        "Детские товары",
        "Одежда и обувь",
        "Товары для дома",
        "Логистика",
        "Фармацевтика",
        "HoReCa",
        "Собственные торговые марки",
        "Маркетплейсы",
        "Упаковка",
    ],
    "Конференции": [
        "Здравоохранение",
        "Мебель",
        "Агропродмаш",
        "Стратегия рынка",
    ],
    "Кросс / ИИ": [
        "Искусственный интеллект",
        "Рыночные тренды",
    ],
}


PERIOD_MAP: dict[str, dict[str, Any]] = {
    "24h": {"label": "последние 24 часа", "days": 1},
    "7d": {"label": "последние 7 дней", "days": 7},
    "30d": {"label": "последние 30 дней", "days": 30},
}


TRUSTED_DOMAINS: dict[str, list[str]] = {
    "general": [
        "rbc.ru",
        "kommersant.ru",
        "vedomosti.ru",
        "tass.ru",
        "interfax.ru",
        "ria.ru",
        "1prime.ru",
    ],
    "healthcare": [
        "roszdravnadzor.gov.ru",
        "minzdrav.gov.ru",
        "government.ru",
        "who.int",
        "fsa.gov.ru",
    ],
    "food": [
        "milknews.ru",
        "retail.ru",
        "sfera.fm",
        "agroinvestor.ru",
        "new-retail.ru",
    ],
    "nonfood": [
        "new-retail.ru",
        "retail.ru",
        "shopandmall.ru",
        "oborot.ru",
        "e-pepper.ru",
    ],
    "industry": [
        "minpromtorg.gov.ru",
        "fas.gov.ru",
        "economy.gov.ru",
        "acort.ru",
    ],
    "ai": [
        "openai.com",
        "huggingface.co",
        "theverge.com",
        "techcrunch.com",
        "venturebeat.com",
    ],
}


RSS_FEEDS: dict[str, list[str]] = {
    "general": [
        "https://rssexport.rbc.ru/rbcnews/news/30/full.rss",
        "https://www.kommersant.ru/RSS/news.xml",
        "https://tass.ru/rss/v2.xml",
    ],
}


TOPIC_ALIASES: dict[str, list[str]] = {
    "Фуд": ["фуд", "food", "продукты", "fmcg", "продовольствие"],
    "Нон-фуд": ["нон-фуд", "non-food", "непродовольственный", "retail"],
    "Нон-фуд (Питерфуд, Нева Байерсвик)": ["нон-фуд", "retail", "питерфуд", "нева байерсвик"],
    "Здравоохранение": ["здравоохранение", "медицина", "медизделия", "фарма"],
    "Мебель": ["мебель", "интерьер", "деревообработка"],
    "Агропродмаш": ["агропродмаш", "пищевая промышленность", "оборудование"],
    "Стратегия рынка": ["рынок", "strategy", "инвестиции", "потребление"],
    "Искусственный интеллект": ["ai", "искусственный интеллект", "llm", "генеративный ai"],
    "Рыночные тренды": ["рынок", "тренды", "аналитика", "спрос"],
}


TELEGRAM_HINTS: dict[str, list[str]] = {
    "Искусственный интеллект": ["themelibrary", "addmeto", "whackdoor"],
    "Фуд": ["foodmarketspb", "retailrus"],
    "Нон-фуд": ["retailrus", "marketplace_biz"],
    "Здравоохранение": ["medachnews", "medvestnik"],
}


@dataclass(frozen=True)
class TopicContext:
    domain_bucket: str
    keywords: list[str]
    telegram_channels: list[str]


def build_topic_context(topic: str) -> TopicContext:
    lowered = topic.lower()
    if "здрав" in lowered or "мед" in lowered:
        bucket = "healthcare"
    elif "фуд" in lowered or "агро" in lowered:
        bucket = "food"
    elif "нон" in lowered or "retail" in lowered or "мебел" in lowered:
        bucket = "nonfood"
    elif "ии" in lowered or "ai" in lowered:
        bucket = "ai"
    else:
        bucket = "industry"

    keywords = TOPIC_ALIASES.get(topic, [topic.lower()])
    telegram_channels = TELEGRAM_HINTS.get(topic, [])
    return TopicContext(
        domain_bucket=bucket,
        keywords=keywords,
        telegram_channels=telegram_channels,
    )
