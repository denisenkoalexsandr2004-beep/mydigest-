const { SOURCES } = require("./sources");

const FEED_TTL_MS = 30 * 60 * 1000;
const MAX_ITEMS = 5;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const feedCache = new Map();

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const direction = resolveDirection(event.queryStringParameters?.direction);
    const period = resolvePeriod(event.queryStringParameters?.period);
    const config = SOURCES[direction];

    const articles = await collectArticles(config.feeds, period.days);
    if (!articles.length) {
      return json(503, { error: "Sources unavailable", items: [] });
    }

    const selectedArticles = selectRelevantArticles(articles, config);
    if (selectedArticles.length < MAX_ITEMS) {
      return json(503, { error: "Not enough relevant articles", items: [] });
    }

    const fallbackItems = selectedArticles.map((article) => toDigestItem(article, config));
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
  if (["30d", "30", "30days"].includes(raw)) return { key: "30d", days: 30 };
  return { key: "7d", days: 7 };
}

async function collectArticles(feeds, periodDays) {
  const batches = await Promise.all(feeds.map((feed) => safeFetchFeed(feed)));
  const cutoff = Date.now() - periodDays * 24 * 60 * 60 * 1000;
  const unique = new Map();

  batches.flat().forEach((article) => {
    const published = dateValue(article.publishedAt);
    if (published && published < cutoff) return;
    if (!article.title || !article.url || !isLikelyArticleUrl(article.url)) return;

    const dedupeKey = `${normalizeDedupe(article.url)}::${normalizeDedupe(article.title)}`;
    if (unique.has(dedupeKey)) return;
    unique.set(dedupeKey, article);
  });

  return [...unique.values()];
}

async function safeFetchFeed(feed) {
  try {
    return await fetchFeed(feed);
  } catch (error) {
    const cached = feedCache.get(feed.url);
    return cached?.items || [];
  }
}

async function fetchFeed(feed) {
  const cached = feedCache.get(feed.url);
  if (cached && Date.now() - cached.updatedAt < FEED_TTL_MS) {
    return cached.items;
  }

  const response = await fetch(feed.url, {
    headers: {
      "user-agent": "MyDigest/1.0 (+https://mydigest.internal)",
      accept: "application/rss+xml, application/xml, text/xml, application/atom+xml",
    },
  });

  if (!response.ok) {
    return cached?.items || [];
  }

  const xml = await response.text();
  const items = parseFeed(xml, feed);
  feedCache.set(feed.url, { updatedAt: Date.now(), items });
  return items;
}

function parseFeed(xml, feed) {
  const rssItems = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  const atomItems = xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  const blocks = rssItems.length ? rssItems : atomItems;

  return blocks.map((block) => ({
    title: clean(extract(block, "title")),
    summary: clean(
      extract(block, "description") ||
      extract(block, "content:encoded") ||
      extract(block, "summary") ||
      extract(block, "content")
    ),
    url: extractUrl(block),
    publishedAt: clean(extract(block, "pubDate") || extract(block, "dc:date") || extract(block, "published") || extract(block, "updated")),
    source: feed.name,
  }));
}

function extract(block, tag) {
  const pattern = new RegExp(`<${escapeRegExp(tag)}[^>]*>([\\s\\S]*?)<\\/${escapeRegExp(tag)}>`, "i");
  const match = block.match(pattern);
  return match ? match[1] : "";
}

function extractUrl(block) {
  const linkTag = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i);
  if (linkTag?.[1]) return clean(linkTag[1]);
  return clean(extract(block, "link")) || clean(extract(block, "guid"));
}

function selectRelevantArticles(articles, config) {
  return articles
    .map((article) => ({ article, score: relevanceScore(article, config) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return dateValue(b.article.publishedAt) - dateValue(a.article.publishedAt);
    })
    .map((item) => item.article)
    .slice(0, MAX_ITEMS);
}

function relevanceScore(article, config) {
  const text = `${article.title} ${article.summary}`.toLowerCase();
  const keywordScore = config.keywords.reduce((score, keyword) => score + (text.includes(keyword.toLowerCase()) ? 3 : 0), 0);
  const freshnessScore = Math.max(0, 7 - Math.floor((Date.now() - dateValue(article.publishedAt)) / (24 * 60 * 60 * 1000)));
  return keywordScore + freshnessScore;
}

function toDigestItem(article, config) {
  return {
    title: trimToSentence(article.title, 170),
    source: article.source,
    url: article.url,
    publishedAt: normalizeDate(article.publishedAt),
    conclusion: buildConclusion(article, config),
    summary: buildSummary(article),
    importance: "Важно",
    readingTime: "2 мин чтения",
  };
}

async function enrichWithOpenAI(articles, fallbackItems, config, period) {
  if (!process.env.OPENAI_API_KEY) {
    return fallbackItems;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
              "Пиши на русском языке, спокойно и профессионально.",
              "Не давай советов, KPI, рейтингов, блоков 'что делать' или рекомендаций.",
              "Верни только валидный JSON.",
              "Не меняй source, url и publishedAt. Эти поля будут восстановлены из RSS.",
            ].join(" "),
          },
          {
            role: "user",
            content: buildOpenAIPrompt(articles, config, period),
          },
        ],
      }),
    });

    if (!response.ok) return fallbackItems;

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(content);
    const aiItems = Array.isArray(parsed.items) ? parsed.items : [];
    const normalized = aiItems
      .slice(0, fallbackItems.length)
      .map((item, index) => normalizeAIItem(item, fallbackItems[index]))
      .filter(Boolean);

    return normalized.length === MAX_ITEMS ? normalized : fallbackItems;
  } catch (error) {
    return fallbackItems;
  }
}

function buildOpenAIPrompt(articles, config, period) {
  const sourcePayload = articles.map((article, index) => ({
    id: index + 1,
    title: article.title,
    summary: article.summary,
    source: article.source,
    url: article.url,
    publishedAt: article.publishedAt,
  }));

  return `
Направление: ${config.label}
Период: ${period.key}

Сформируй ровно ${MAX_ITEMS} digest items для MyDigest.

Строгий JSON:
{
  "items": [
    {
      "title": "фактический заголовок новости, без вывода",
      "conclusion": "2-4 предложения: что новость означает для направления ${config.label}; не повторяй title",
      "summary": "5-8 коротких предложений: что произошло, кто участники, контекст и факты из материала",
      "importance": "короткая метка: Важно | Рынок | Регулирование | Технологии | Поставщики",
      "readingTime": "2 мин чтения"
    }
  ]
}

Правила:
- Используй только факты из материалов.
- Не придумывай цифры, компании, даты и события.
- Не добавляй советы и рекомендации.
- Не копируй статью целиком.
- title, conclusion и summary должны отличаться.
- source, url и publishedAt не возвращай: они будут взяты из RSS.

Материалы:
${JSON.stringify(sourcePayload, null, 2)}
`.trim();
}

function normalizeAIItem(item, fallback) {
  if (!item || !fallback) return null;
  return {
    title: trimToSentence(item.title || fallback.title, 170),
    source: fallback.source,
    url: fallback.url,
    publishedAt: fallback.publishedAt,
    conclusion: ensureDifferentText(trimToSentence(item.conclusion || fallback.conclusion, 520), fallback.title, fallback.conclusion),
    summary: normalizeSummary(item.summary || fallback.summary),
    importance: trimToSentence(item.importance || fallback.importance, 32).replace(/\.$/, "") || "Важно",
    readingTime: trimToSentence(item.readingTime || fallback.readingTime, 24).replace(/\.$/, "") || "2 мин чтения",
  };
}

function buildConclusion(article, config) {
  if (config.label === "ЦЗС / Ритейл") {
    return "Для ЦЗС это важно читать через переговоры с сетями, требования к поставщикам, категорийную экономику и коммерческие аргументы. Новость помогает понять, какие ожидания рынка могут повлиять на разговоры с закупщиками и поставщиками.";
  }
  if (config.label === "Выставки") {
    return "Для выставочного направления это показывает, какие темы могут быть важны экспонентам и посетителям. Новость помогает точнее видеть спрос на деловую программу, закупочные встречи и практические маршруты внутри выставки.";
  }
  if (config.label === "Конференции") {
    return "Для конференционного направления это потенциальный контекст для программы, спикеров и отраслевой дискуссии. Новость показывает, какие вопросы становятся заметными для рынка, регуляторов или профессионального сообщества.";
  }
  return "Для компании это показывает, какие AI-инструменты переходят из новостей в реальные рабочие сценарии. Важно видеть не хайп вокруг технологии, а её применение в процессах, данных, документах и аналитике.";
}

function buildSummary(article) {
  const text = article.summary || article.title;
  return trimToSentence(text, 760);
}

function normalizeSummary(value) {
  const text = clean(value);
  if (!text) return "";
  return text
    .split(/\n{2,}|\r\n\r\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(" ");
}

function isLikelyArticleUrl(value) {
  try {
    const url = new URL(value);
    const path = url.pathname.replace(/\/+$/, "");
    if (!["http:", "https:"].includes(url.protocol)) return false;
    if (!path) return false;
    if (/\/rss|\/feed|\/news$|\/business$|\/media\/news$/i.test(path)) return false;
    return path.split("/").filter(Boolean).length >= 1;
  } catch (error) {
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
  const time = Date.parse(value || "");
  return Number.isFinite(time) ? new Date(time).toISOString() : new Date().toISOString();
}

function dateValue(value) {
  const time = Date.parse(value || "");
  return Number.isFinite(time) ? time : 0;
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
  const sliced = text.slice(0, limit);
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
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
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
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
    body: JSON.stringify(body),
  };
}
