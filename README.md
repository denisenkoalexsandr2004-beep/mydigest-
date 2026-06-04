# MyDigest MVP

MyDigest — внутренний AI-дайджест для коллег компании. Продукт собирает свежие материалы из отраслевых RSS-источников, фильтрует их по направлению и превращает новости в короткие рабочие сигналы.

## Текущая архитектура

- `public/index.html` — production-интерфейс для Netlify.
- `prototype.html` — локальный прототип интерфейса.
- `index.html` — копия прототипа для локального открытия.
- `netlify/functions/digest.js` — endpoint `/api/digest`.
- `netlify/functions/sources.js` — конфиг источников, весов и фильтров по направлениям.
- `netlify.toml` — настройки Netlify publish/functions/redirects.

## API

```text
GET /api/digest?direction=retail&period=7d
```

Параметры:

- `direction`: `retail`, `exhibitions`, `conferences`, `ai`
- `period`: `today`, `7d`, `30d`

Ответ:

```json
{
  "direction": "retail",
  "period": "7d",
  "updatedAt": "2026-06-04T09:00:00.000Z",
  "items": [
    {
      "title": "Название новости",
      "source": "Retail.ru",
      "url": "https://...",
      "publishedAt": "2026-06-04T09:00:00.000Z",
      "conclusion": "Вывод для выбранного направления",
      "summary": "Краткое содержание новости",
      "importance": "Important",
      "readingTime": "2 мин чтения"
    }
  ]
}
```

## Источники

Источники и веса находятся в `netlify/functions/sources.js`.

Направления:

- `retail` — ЦЗС / Ритейл
- `exhibitions` — Выставки
- `conferences` — Конференции
- `ai` — ИИ

## Логика отбора

1. Получить RSS-материалы из источников направления.
2. Отфильтровать по выбранному периоду.
3. Удалить дубли по URL и заголовку.
4. Отсеять нерелевантные материалы по ключевым словам.
5. Отсеять явно чужие темы через exclude-фильтр.
6. Отсортировать по весу источника, релевантности и свежести.
7. Передать топ-5 материалов в OpenAI для интерпретации.
8. Если OpenAI недоступен, вернуть RSS fallback без подмены source/url.

## Netlify

Настройки:

- Publish directory: `public`
- Functions directory: `netlify/functions`
- Build command: пусто

Environment Variables:

- `OPENAI_API_KEY`
- `OPENAI_MODEL=gpt-4o-mini`

Redirect:

```toml
[[redirects]]
  from = "/api/digest"
  to = "/.netlify/functions/digest"
  status = 200
```

## Важно

В корне проекта не должно быть `requirements.txt`, иначе Netlify может попытаться собрать Python-зависимости. Старый Python backend, если нужен для истории, лежит отдельно в `backend/`.
