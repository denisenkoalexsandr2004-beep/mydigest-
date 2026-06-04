# MyDigest MVP

MVP-портал для компании Империя Форум. Приложение формирует верифицированный дайджест по рабочей теме с агентным циклом `PLAN -> SEARCH -> FILTER -> ANALYZE -> VERIFY -> OUTPUT`.

## Что внутри

- `backend/` — FastAPI API и агентная логика.
- `frontend/` — одностраничный интерфейс на HTML/CSS/Vanilla JS.
- `requirements.txt` — зависимости Python.
- `.env.example` — переменные окружения.

## Возможности MVP

- форма запроса по подразделению, тематике и периоду;
- потоковый прогресс генерации;
- сбор кандидатов из RSS, trusted web domains и публичных Telegram-каналов;
- фильтрация и дедупликация источников;
- финальный дайджест в заданной markdown-структуре.

## Быстрый старт

1. Создайте и активируйте виртуальное окружение.
2. Установите зависимости:

```bash
pip install -r requirements.txt
```

3. Скопируйте `.env.example` в `.env` и заполните:

- `OPENAI_API_KEY` — обязателен;
- `OPENAI_MODEL` — по умолчанию `gpt-4o`;
- `OPENAI_ENABLE_WEB_SEARCH=true` — включает web search tool в OpenAI Responses API;
- `TELEGRAM_BOT_TOKEN` — опционально, если хотите подтягивать публичные каналы через Bot API.

4. Запустите сервер:

```bash
uvicorn backend.app:app --reload
```

5. Откройте:

```text
http://127.0.0.1:8000
```

## Архитектура

### Backend

- `GET /api/meta` — метаданные для формы.
- `POST /api/digest/stream` — SSE-поток событий по этапам агентного цикла.

### Agent Loop

1. `PLAN` — определяет trusted domains, поисковые запросы и подсказки по Telegram.
2. `SEARCH` — собирает RSS, Telegram и web search candidates.
3. `FILTER` — убирает дубли и нетрастовые ссылки.
4. `ANALYZE` — передает отобранные источники в OpenAI.
5. `VERIFY` — контролирует минимальный набор проверенных ссылок.
6. `OUTPUT` — возвращает финальный дайджест.

## Ограничения текущего MVP

- Для реального веб-поиска нужен доступ к OpenAI API и включенный tool `web_search`.
- Telegram сейчас подключен через Bot API как легкий MVP-канал; для полноценного чтения истории публичных каналов лучше перейти на `telethon` или `pyrogram`.
- Если проверенных источников меньше пяти, API возвращает ошибку вместо слабого дайджеста.

## Деплой

### Render / Railway

- backend разворачивается как Python web service;
- стартовая команда: `uvicorn backend.app:app --host 0.0.0.0 --port $PORT`.

### Netlify

Если понадобится разнести frontend и backend, `frontend/` можно вынести в отдельный статический deploy, а API оставить на Render/Railway. В текущем MVP FastAPI уже умеет раздавать frontend сам.
