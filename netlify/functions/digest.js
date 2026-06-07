const { SOURCES } = require("./sources");

const FEED_TTL_MS      = 30 * 60 * 1000;
const FEED_TIMEOUT_MS  = 4000;
const DDGS_TIMEOUT_MS  = 8000;
const OPENAI_TIMEOUT_MS = 20000;
const MAX_ITEMS        = 10;
const OPENAI_MODEL     = process.env.OPENAI_MODEL || "gpt-4o-mini";
const DDGS_API_URL     = (process.env.DDGS_API_URL || "").replace(/\/+$/, "");

const feedCache = new Map();

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const direction = resolveDirection(event.queryStringParameters?.direction);
    const period    = resolvePeriod(event.queryStringParameters?.period);
    const config    = SOURCES[direction];

    const articles = await collectArticles(config, period);
    if (!articles.length) {
      return json(503, { error: "Sources unavailable", items: [] });
    }

    const selectedArticles = selectRelevantArticles(articles, config);
    if (!selectedArticles.length) {
      return json(200, {
        direction,
        period: period.key,
        updatedAt: new Date().toISOString(),
        items: [],
      });
    }

    const fallbackItems = selectedArticles.map((a) => toDigestItem(a, config));
    const items = await enrichWithOpenAI(selectedArticles, fallbackItems, config, period);

    return json(200, {
      direction,
      period: period.key,
      updatedAt: new Date().toISOString(),
      items: items.slice(0, MAX_ITEMS),
    });
  } catch (error) {
    return json(500, {
      error: "Digest update failed",
      message: error instanceof Error ? error.message : "Unknown error",
      items: [],
    });
  }
};

function resolveDirection(value = "retail") {
  const normalized = String(value || "retail").trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(SOURCES, normalized) ? normalized : "retail";
}

function resolvePeriod(value = "7d") {
  const raw = String(value || "7d").trim().toLowerCase();
  if (["today", "1", "1d", "24h", "сегодня"].includes(raw)) return { key: "today", days: 1 };
  if (["30d", "30", "30days"].includes(raw))                  return { key: "30d",   days: 30 };
  return                                                              { key: "7d",    days: 7 };
}

// Detect if text is predominantly Russian (Cyrillic)
function isRussianText(text) {
  if (!text) return false;
  const letters   = (text.match(/[a-zA-Zа-яёА-ЯЁ]/g) || []).length;
  const cyrillic  = (text.match(/[а-яёА-ЯЁ]/g) || []).length;
  if (letters < 6) return true; // too short to determine — allow
  return cyrillic / letters >= 0.3;
}

async function collectArticles(config, period) {
  const feedBatches = await Promise.all(config.feeds.map((feed) => safeFetchFeed(feed)));
  const htmlBatches = await Promise.all((config.htmlSources || []).map((source) => safeFetchHtmlSource(source)));
  const ddgsBatch   = await safeFetchDdgs(config, period);
  const batches     = [...feedBatches, ...htmlBatches, ddgsBatch];
  const cutoff  = Date.now() - period.days * 24 * 60 * 60 * 1000;
  const unique  = new Map();

  batches.flat().forEach((article) => {
    const published = dateValue(article.publishedAt);
    if (published && published < cutoff) return;
    if (!article.title || !article.url || !isLikelyArticleUrl(article.url)) return;
    if (!isTrustedArticle(article, config)) return;
    if (config.requireRussian && !isRussianText(`${article.title} ${article.summary}`)) return;

    article.sourceWeight = trustedDomainWeight(article, config) || article.sourceWeight || config.ddgsWeight || 1;
    const key = `${normalizeDedupe(article.url)}::${normalizeDedupe(article.title)}`;
    if (!unique.has(key)) unique.set(key, article);
  });

  let articles = [...unique.values()];

  // Auto-expand period if too few articles (up to 3× the requested period, max 30 days)
  if (articles.length < MAX_ITEMS && period.days < 30) {
    const expandedDays   = Math.min(period.days * 3, 30);
    const expandedCutoff = Date.now() - expandedDays * 24 * 60 * 60 * 1000;
    const expanded       = new Map(unique);

    batches.flat().forEach((article) => {
      const published = dateValue(article.publishedAt);
      if (published && published < expandedCutoff) return;
      if (!article.title || !article.url || !isLikelyArticleUrl(article.url)) return;
      if (!isTrustedArticle(article, config)) return;
      if (config.requireRussian && !isRussianText(`${article.title} ${article.summary}`)) return;

      article.sourceWeight = trustedDomainWeight(article, config) || article.sourceWeight || config.ddgsWeight || 1;
      const key = `${normalizeDedupe(article.url)}::${normalizeDedupe(article.title)}`;
      if (!expanded.has(key)) expanded.set(key, article);
    });

    articles = [...expanded.values()];
  }

  return articles;
}

async function safeFetchFeed(feed) {
  try {
    return await fetchFeed(feed);
  } catch {
    return feedCache.get(feed.url)?.items || [];
  }
}

async function fetchFeed(feed) {
  const cached = feedCache.get(feed.url);
  if (cached && Date.now() - cached.updatedAt < FEED_TTL_MS) return cached.items;

  const response = await fetchWithTimeout(feed.url, {
    headers: {
      "user-agent": "MyDigest/1.0 (+https://mydigest.internal)",
      accept: "application/rss+xml, application/xml, text/xml, application/atom+xml",
    },
  }, FEED_TIMEOUT_MS);

  if (!response.ok) return cached?.items || [];

  const xml   = await response.text();
  const items = parseFeed(xml, feed);
  feedCache.set(feed.url, { updatedAt: Date.now(), items });
  return items;
}

async function safeFetchHtmlSource(source) {
  try {
    return await fetchHtmlSource(source);
  } catch {
    return [];
  }
}

async function fetchHtmlSource(source) {
  const response = await fetchWithTimeout(source.url, {
    headers: {
      "user-agent": "MyDigest/1.0 (+https://mydigest.internal)",
      accept: "text/html,application/xhtml+xml",
    },
  }, FEED_TIMEOUT_MS);

  if (!response.ok) return [];

  const html = await response.text();
  const seen = new Set();
  const links = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => {
      const url = absoluteUrl(match[1], source.url);
      const title = clean(match[2]);
      return { url, title };
    })
    .filter((item) => item.url && item.title.length >= 24)
    .filter((item) => source.include?.some((part) => item.url.includes(part)))
    .filter((item) => !source.exclude?.some((part) => item.url.includes(part)))
    .filter((item) => {
      const key = normalizeDedupe(item.url);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, source.limit || 20);

  return links.map((item) => ({
    title: item.title,
    summary: item.title,
    url: item.url,
    publishedAt: new Date().toISOString(),
    source: source.name,
    sourceWeight: source.weight || 1,
  }));
}

function absoluteUrl(value, base) {
  try {
    return new URL(value, base).href;
  } catch {
    return "";
  }
}

async function safeFetchDdgs(config, period) {
  if (!DDGS_API_URL || !Array.isArray(config.searchQueries) || !config.searchQueries.length) {
    return [];
  }

  const queries = ddgsQueries(config).slice(0, 10);
  const collected = [];

  // DDGS/Render can return 500 under burst traffic. Small batches keep it stable
  // while still checking multiple trusted sources on every digest request.
  for (let i = 0; i < queries.length; i += 3) {
    const batch = queries.slice(i, i + 3);
    const results = await Promise.allSettled(batch.map((query) => fetchDdgsNews(query, config, period)));
    collected.push(...results.filter((result) => result.status === "fulfilled").flatMap((result) => result.value));
    if (collected.length >= 70) break;
  }

  return collected;
}

async function fetchDdgsNews(query, config, period) {
  const url = new URL(`${DDGS_API_URL}/search/news`);
  url.searchParams.set("query", query);
  url.searchParams.set("region", config.ddgsRegion || "ru-ru");
  url.searchParams.set("safesearch", "moderate");
  url.searchParams.set("timelimit", ddgsTimelimit(period));
  url.searchParams.set("max_results", "25");
  url.searchParams.set("backend", "auto");

  const response = await fetchWithTimeout(url.toString(), {
    headers: {
      "user-agent": "MyDigest/1.0 (+https://mydigest.internal)",
      accept: "application/json",
    },
  }, DDGS_TIMEOUT_MS);

  if (!response.ok) return [];

  const payload = await response.json();
  const items = Array.isArray(payload) ? payload : (Array.isArray(payload.results) ? payload.results : []);

  return items.map((item) => ({
    title:       clean(item.title),
    summary:     clean(item.body || item.snippet || item.description || item.summary),
    url:         clean(item.url || item.href || item.link),
    publishedAt: clean(item.date || item.published || item.publishedAt || item.updated),
    source:      clean(item.source || item.publisher || item.provider || "DDGS"),
    sourceWeight: config.ddgsWeight || 8,
  }));
}

function ddgsQueries(config) {
  const base = Array.isArray(config.searchQueries) ? config.searchQueries : [];
  const domainTerm = config.domainSearchTerm || base[0] || config.label;
  const domainQueries = (config.trustedDomains || [])
    .filter(([, weight]) => weight >= 9)
    .slice(0, 6)
    .flatMap(([domain]) => [
      `site:${domain} ${domainTerm}`,
    ]);
  return [...new Set([...domainQueries, ...base])];
}

function ddgsTimelimit(period) {
  if (period.key === "today") return "d";
  if (period.key === "30d") return "m";
  return "w";
}

function parseFeed(xml, feed) {
  const rssItems  = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  const atomItems = xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  const blocks    = rssItems.length ? rssItems : atomItems;

  return blocks.map((block) => ({
    title:       clean(extract(block, "title")),
    summary:     clean(
      extract(block, "description") ||
      extract(block, "content:encoded") ||
      extract(block, "summary") ||
      extract(block, "content")
    ),
    url:         extractUrl(block),
    publishedAt: clean(
      extract(block, "pubDate") || extract(block, "dc:date") ||
      extract(block, "published") || extract(block, "updated")
    ),
    source:       feed.name,
    sourceWeight: feed.weight || 1,
  }));
}

function extract(block, tag) {
  const pattern = new RegExp(`<${escapeRegExp(tag)}[^>]*>([\\s\\S]*?)<\\/${escapeRegExp(tag)}>`, "i");
  const m = block.match(pattern);
  return m ? m[1] : "";
}

function extractUrl(block) {
  const linkTag = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i);
  if (linkTag?.[1]) return clean(linkTag[1]);
  return clean(extract(block, "link")) || clean(extract(block, "guid"));
}

// Prefer fewer relevant items over filling the digest with unrelated news.
function selectRelevantArticles(articles, config) {
  const scored = articles
    .map((article) => ({ article, score: relevanceScore(article, config) }))
    .filter((item) => item.score > -500) // exclude only hard-excluded items
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return dateValue(b.article.publishedAt) - dateValue(a.article.publishedAt);
    });

  // Step 1: strict threshold
  const strict = diversify(scored.filter((i) => i.score >= config.minScore).map((i) => i.article), MAX_ITEMS);
  if (strict.length >= Math.min(5, MAX_ITEMS)) return strict;

  // Step 2: half threshold
  const relaxed = diversify(scored.filter((i) => i.score >= config.minScore * 0.5).map((i) => i.article), MAX_ITEMS);
  if (relaxed.length >= Math.min(5, MAX_ITEMS)) return relaxed;

  // Step 3: any positive score
  const positive = diversify(scored.filter((i) => i.score > 0).map((i) => i.article), MAX_ITEMS);
  if (positive.length > 0) return positive;

  return [];
}

function diversify(articles, limit) {
  const counts = new Map();
  const selected = [];
  for (const article of articles) {
    const domain = articleDomain(article.url);
    const count = counts.get(domain) || 0;
    if (count >= 2) continue;
    selected.push(article);
    counts.set(domain, count + 1);
    if (selected.length >= limit) break;
  }

  if (selected.length >= limit) return selected;

  const selectedKeys = new Set(selected.map((article) => normalizeDedupe(article.url)));
  for (const article of articles) {
    const key = normalizeDedupe(article.url);
    if (selectedKeys.has(key)) continue;
    selected.push(article);
    selectedKeys.add(key);
    if (selected.length >= limit) break;
  }

  return selected;
}

function relevanceScore(article, config) {
  const text         = `${article.title} ${article.summary}`.toLowerCase();
  const requiredHits = countMatches(text, config.requiredAny);
  const trustedWeight = trustedDomainWeight(article, config);

  if (config.exclude?.some((kw) => text.includes(kw.toLowerCase()))) return -1000;
  if (!requiredHits && trustedWeight < (config.specialistSourceMinWeight || 99)) return -1000;

  const keywordScore  = countMatches(text, config.keywords) * 3;
  const requiredScore = requiredHits * 5;
  const sourceScore   = (article.sourceWeight || 1) * 4;
  const trustedScore  = trustedWeight ? 10 : -20;
  const daysOld       = Math.max(0, Math.floor((Date.now() - dateValue(article.publishedAt)) / 86400000));
  const freshnessScore = Math.max(0, 7 - daysOld);

  return sourceScore + requiredScore + keywordScore + freshnessScore + trustedScore;
}

function isTrustedArticle(article, config) {
  const domain = articleDomain(article.url);
  if (!domain) return false;
  return Boolean((config.trustedDomains || []).find(([trusted]) => domainMatches(domain, trusted)));
}

function trustedDomainWeight(article, config) {
  const domain = articleDomain(article.url);
  const found = (config.trustedDomains || []).find(([trusted]) => domainMatches(domain, trusted));
  return found ? found[1] : 0;
}

function articleDomain(value) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function domainMatches(domain, trusted) {
  const normalized = String(trusted || "").toLowerCase().replace(/^www\./, "");
  return domain === normalized || domain.endsWith(`.${normalized}`);
}

function countMatches(text, keywords = []) {
  return keywords.reduce((n, kw) => n + (text.includes(kw.toLowerCase()) ? 1 : 0), 0);
}

function toDigestItem(article, config) {
  return {
    title:       cleanTitle(article.title, article.source),
    source:      article.source,
    url:         article.url,
    publishedAt: normalizeDate(article.publishedAt),
    conclusion:  buildConclusion(article, config),
    summary:     buildSummary(article),
    importance:  "Important",
    readingTime: "2 мин чтения",
  };
}

async function enrichWithOpenAI(articles, fallbackItems, config, period) {
  if (!process.env.OPENAI_API_KEY) return fallbackItems;

  try {
    const response = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "Ты редактор внутреннего продукта MyDigest.",
              "Всегда пиши только на русском языке — переводи заголовки если они на английском.",
              "Спокойно и профессионально. Без советов, KPI, рейтингов и рекомендаций.",
              "Поле conclusion должно быть полностью уникальным для каждой статьи — опирайся на конкретные факты именно этого материала, не пиши общих фраз.",
              "Верни только валидный JSON.",
              "Не меняй source, url и publishedAt.",
            ].join(" "),
          },
          {
            role: "user",
            content: buildOpenAIPrompt(articles, config, period),
          },
        ],
      }),
    }, OPENAI_TIMEOUT_MS);

    if (!response.ok) return fallbackItems;

    const payload  = await response.json();
    const content  = payload?.choices?.[0]?.message?.content || "";
    const parsed   = JSON.parse(content);
    const aiItems  = Array.isArray(parsed.items) ? parsed.items : [];

    const normalized = aiItems
      .slice(0, fallbackItems.length)
      .map((item, i) => normalizeAIItem(item, fallbackItems[i]))
      .filter(Boolean);

    return normalized.length > 0 ? normalized : fallbackItems;
  } catch {
    return fallbackItems;
  }
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function buildOpenAIPrompt(articles, config, period) {
  const periodDesc = {
    today: "Сегодня (последние 24 часа) — оперативные события, свежие данные, немедленные изменения.",
    "7d":  "Последние 7 дней — недельные тренды, ключевые события, то что изменилось на рынке.",
    "30d": "Последние 30 дней — стратегические сдвиги, крупные тенденции, масштабные изменения.",
  }[period.key] || "Последние 7 дней.";

  const sourcePayload = articles.map((a, i) => ({
    id: i + 1,
    title:        a.title,
    summary:      a.summary,
    source:       a.source,
    sourceWeight: a.sourceWeight,
    url:          a.url,
    publishedAt:  a.publishedAt,
  }));

  return `
Направление: ${config.label}
Период: ${periodDesc}
Focus areas: ${config.focusAreas.join(", ")}
Conclusion logic: ${config.conclusionLogic.join("; ")}

Сформируй ${articles.length} digest items для MyDigest. Все тексты строго на русском языке.

JSON:
{
  "items": [
    {
      "title": "короткий фактический заголовок новости на русском языке. Не добавляй название источника, не используй символ |, не пиши вывод",
      "conclusion": "3-4 предложения СТРОГО под ДАННУЮ статью: как именно эта новость может быть использована внутри компании и почему она важна для ${config.label}. Не повторяй заголовок. Не используй шаблонные фразы. Привяжи вывод к фактам статьи.",
      "summary": "6-8 предложений: что произошло, кто участники, ключевые факты и цифры, контекст, причины и последствия события. Текст должен быть содержательным и понятным без открытия оригинала",
      "importance": "Critical | Important | For Information",
      "readingTime": "2 мин чтения"
    }
  ]
}

Правила:
- Все поля title, conclusion, summary — только на русском языке.
- Используй только факты из материалов, не придумывай.
- В title запрещено указывать source или использовать формат "заголовок | источник".
- title, conclusion и summary должны отличаться по смыслу.
- conclusion объясняет значение для направления с учётом периода: ${periodDesc}
- source, url и publishedAt не возвращай.

Материалы:
${JSON.stringify(sourcePayload, null, 2)}
`.trim();
}

function normalizeAIItem(item, fallback) {
  if (!item || !fallback) return null;
  return {
    title:       cleanTitle(item.title || fallback.title, fallback.source),
    source:      fallback.source,
    url:         fallback.url,
    publishedAt: fallback.publishedAt,
    conclusion:  ensureDifferentText(
      trimToSentence(item.conclusion || fallback.conclusion, 520),
      fallback.title, fallback.conclusion
    ),
    summary:     normalizeSummary(item.summary || fallback.summary),
    importance:  normalizeImportance(item.importance || fallback.importance),
    readingTime: trimToSentence(item.readingTime || fallback.readingTime, 24).replace(/\.$/, "") || "2 мин чтения",
  };
}

function cleanTitle(value, source) {
  let title = clean(value).replace(/\s+/g, " ").trim();
  const sourceName = clean(source).replace(/\s+/g, " ").trim();
  if (sourceName) {
    title = title
      .replace(new RegExp(`\\s*[|—-]\\s*${escapeRegExp(sourceName)}\\.?$`, "i"), "")
      .replace(new RegExp(`\\s*\\|\\s*${escapeRegExp(sourceName)}.*$`, "i"), "");
  }
  title = title.replace(/\s*\|\s*[^|]{2,40}\.?$/g, "");
  return trimToSentence(title, 150);
}

function buildConclusion(article, config) {
  const topic = trimToSentence(article.title, 90).replace(/\.$/, "");
  const map = {
    retail:      `«${topic}» — для ЦЗС это важно читать через переговоры с сетями и требования к поставщикам. Помогает понять, как это событие влияет на коммерческие аргументы, закупочные встречи и стратегию поставщиков.`,
    exhibitions: `«${topic}» — для выставочного направления это показывает, как меняется спрос экспонентов или посетителей. Помогает оценить, нужны ли изменения в форматах, деловой программе или подходе к будущим проектам.`,
    conferences: `«${topic}» — для конференционного направления это потенциальный контекст для программы и отраслевой дискуссии. Помогает понять, какие темы или регуляторные изменения стоит включить в будущие программы.`,
    ai:          `«${topic}» — для компании это показывает, как данный AI-инструмент или тренд переходит в реальные рабочие сценарии. Стоит оценить, какие отделы могут выиграть от автоматизации на основе этой технологии.`,
  };
  return map[config.type] || map.ai;
}

function buildSummary(article) {
  return trimToSentence(article.summary || article.title, 1400);
}

function normalizeImportance(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw.includes("critical") || raw.includes("крит")) return "Critical";
  if (raw.includes("information") || raw.includes("информа")) return "For Information";
  return "Important";
}

function normalizeSummary(value) {
  const text = clean(value);
  if (!text) return "";
  return text.split(/\n{2,}|\r\n\r\n/).map((p) => p.trim()).filter(Boolean).slice(0, 6).join(" ");
}

function isLikelyArticleUrl(value) {
  try {
    const url  = new URL(value);
    const path = url.pathname.replace(/\/+$/, "");
    if (!["http:", "https:"].includes(url.protocol)) return false;
    if (!path) return false;
    if (/\/rss|\/feed|\/news$|\/business$|\/media\/news$/i.test(path)) return false;
    return path.split("/").filter(Boolean).length >= 1;
  } catch {
    return false;
  }
}

function normalizeDedupe(value) {
  return clean(value)
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function normalizeDate(value) {
  const t = Date.parse(value || "");
  return Number.isFinite(t) ? new Date(t).toISOString() : new Date().toISOString();
}

function dateValue(value) {
  const t = Date.parse(value || "");
  return Number.isFinite(t) ? t : 0;
}

function ensureDifferentText(value, compareTo, fallback) {
  const a = normalizeDedupe(value);
  const b = normalizeDedupe(compareTo);
  return a && a !== b ? value : fallback;
}

function trimToSentence(value, limit) {
  const text = clean(value).replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= limit) return ensurePeriod(text);
  const sliced  = text.slice(0, limit);
  const lastEnd = Math.max(sliced.lastIndexOf("."), sliced.lastIndexOf("!"), sliced.lastIndexOf("?"));
  return ensurePeriod(lastEnd > 80 ? sliced.slice(0, lastEnd + 1) : `${sliced.trim()}...`);
}

function clean(value) {
  return decodeEntities(
    String(value || "")
      .replace(/<!\[CDATA\[|\]\]>/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

function ensurePeriod(value) {
  if (!value) return "";
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    body: JSON.stringify(body),
  };
}
