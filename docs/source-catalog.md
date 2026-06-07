# MyDigest Source Catalog

Дата проверки: 2026-06-06

Назначение: рабочий каталог достоверных источников для MyDigest. Источники сгруппированы по направлениям компании и подходят для поиска через DDGS, RSS и ручной whitelist-фильтрации доменов.

Проверка:

- Изначально было собрано 200 источников: по 50 на каждое направление.
- После удаления источников со статусом `Replace` осталось 194 источника.
- Уникальных URL в каталоге: 190, потому что часть источников сознательно повторяется между направлениями.
- Автоматическая проверка доступности: 151 URL ответил успешно.
- 41 URL не прошел быстрый HTTP-тест за 8 секунд или заблокировал автоматический запрос. Это не означает, что источник недостоверный: среди них государственные сайты, крупные медиа и корпоративные домены, которые часто ограничивают bot/user-agent запросы.
- Для production-парсинга такие источники лучше использовать через DDGS whitelist, а не прямой RSS/HTTP fetch.

Вес:

- `10` — основной источник, высокий приоритет.
- `8-9` — надежный профильный источник.
- `6-7` — дополнительный источник для расширения покрытия.

## ЦЗС / Ритейл

| # | Источник | URL | Вес | Почему подходит |
|---|---|---:|---:|---|
| 1 | Retail.ru | https://www.retail.ru | 10 | Российский ритейл, сети, поставщики, FMCG |
| 2 | New Retail | https://new-retail.ru | 10 | Ритейл, e-commerce, маркетплейсы, потребительский спрос |
| 3 | Retail & Loyalty | https://retail-loyalty.org | 10 | Ритейл, loyalty, платежи, клиентский опыт |
| 4 | Shopper's | https://shoppers.media | 9 | FMCG, сети, производители, потребительский рынок |
| 5 | Sostav | https://www.sostav.ru | 8 | Бренды, промо, маркетинг, FMCG-коммуникации |
| 6 | AdIndex | https://adindex.ru | 8 | Реклама, промо, retail media, бренды |
| 7 | E-pepper | https://e-pepper.ru | 8 | E-commerce, маркетплейсы, онлайн-ритейл |
| 8 | Oborot.ru | https://oborot.ru | 8 | E-commerce и торговые технологии |
| 9 | CNews Retail | https://www.cnews.ru | 7 | ИТ в ритейле, автоматизация, цифровизация |
| 10 | РБК Бизнес | https://www.rbc.ru/business | 8 | Деловые новости компаний и рынков |
| 11 | Коммерсантъ Бизнес | https://www.kommersant.ru | 8 | Деловая повестка, торговля, регулирование |
| 12 | Ведомости Бизнес | https://www.vedomosti.ru/business | 8 | Компании, потребительский рынок, экономика |
| 13 | Forbes Russia Бизнес | https://www.forbes.ru/biznes | 7 | Компании, крупный бизнес, рынок |
| 14 | The DairyNews | https://dairynews.today | 8 | Молочный рынок, поставщики, производство |
| 15 | Milknews | https://milknews.ru | 8 | Молочная отрасль, производители, господдержка |
| 16 | Agroinvestor | https://www.agroinvestor.ru | 8 | АПК, продукты, производители, сырье |
| 17 | FruitNews | https://fruitnews.ru | 7 | Фрукты, овощи, импорт, поставки |
| 18 | Meatinfo | https://meatinfo.ru | 7 | Мясной рынок, цены, поставки |
| 19 | Fishnews | https://fishnews.ru | 7 | Рыбная отрасль, поставщики, регулирование |
| 20 | Алкоголь.ру | https://alcoexpert.ru | 6 | Алкогольный рынок, регулирование, маркировка |
| 21 | Unipack.ru | https://www.unipack.ru | 7 | Упаковка, производство, FMCG |
| 23 | Честный знак | https://честныйзнак.рф | 9 | Маркировка, регулирование товаров |
| 24 | АКОРТ | https://www.acort.ru | 10 | Ассоциация компаний розничной торговли |
| 25 | АКИТ | https://akit.ru | 8 | Интернет-торговля и e-commerce |
| 26 | Руспродсоюз | https://rusprodsoyuz.ru | 8 | Производители продуктов питания |
| 27 | Союзмолоко | https://souzmoloko.ru | 8 | Молочная отрасль, производители |
| 28 | Русбренд | https://www.rusbrand.com | 7 | Производители брендированных товаров |
| 29 | X5 Group Newsroom | https://www.x5.ru/ru/news | 9 | Новости крупной федеральной сети |
| 30 | Магнит Новости | https://www.magnit.com/ru/news | 9 | Новости крупной федеральной сети |
| 31 | Лента Новости | https://lenta.com/presscenter | 8 | Новости федеральной сети |
| 32 | Metro Россия | https://www.metro-cc.ru | 7 | B2B-ритейл, HoReCa, закупки |
| 33 | Ашан Россия | https://www.auchan.ru | 7 | Сеть, ассортимент, поставщики |
| 34 | Fix Price IR/News | https://fix-price.com | 7 | Дискаунтер, товары повседневного спроса |
| 35 | Ozon News | https://corp.ozon.ru/news | 8 | Маркетплейс, продавцы, логистика |
| 36 | Wildberries News | https://www.wildberries.ru | 8 | Маркетплейс, продавцы, логистика |
| 37 | Яндекс Маркет | https://market.yandex.ru | 7 | Маркетплейс, продавцы, e-commerce |
| 38 | М.Видео-Эльдорадо | https://www.mvideoeldorado.ru | 6 | Non-food ритейл, электроника |
| 39 | DNS | https://www.dns-shop.ru | 6 | Non-food ритейл, электроника |
| 40 | ВсеИнструменты.ру | https://www.vseinstrumenti.ru | 6 | DIY, marketplace, поставщики |
| 41 | Леруа Мерлен / Лемана ПРО | https://lemanapro.ru | 6 | DIY, non-food, поставщики |
| 42 | Hoff | https://hoff.ru | 6 | Мебельный ритейл, non-food |
| 43 | INFOLine | https://infoline.spb.ru | 8 | Аналитика ритейла и FMCG |
| 44 | NielsenIQ Russia | https://nielseniq.com | 8 | Потребительская аналитика и FMCG |
| 45 | GfK / NIQ GfK | https://www.gfk.com | 7 | Потребительские рынки, non-food |
| 46 | Data Insight | https://datainsight.ru | 8 | E-commerce аналитика |
| 47 | Romir | https://romir.ru | 7 | Потребительское поведение |
| 48 | Mediascope | https://mediascope.net | 6 | Медиа и потребительские данные |
| 49 | НСПК / Mir | https://www.nspk.ru | 6 | Платежи, потребительские транзакции |
| 50 | Банк России статистика | https://cbr.ru/statistics | 6 | Макроданные, платежи, потребительская активность |

## Выставки

| # | Источник | URL | Вес | Почему подходит |
|---|---|---:|---:|---|
| 1 | Expomap | https://expomap.ru | 10 | Российский каталог выставок и событий |
| 2 | ExpoForum | https://expoforum-center.ru | 10 | Крупная площадка СПб, новости мероприятий |
| 3 | Expocentre | https://www.expocentr.ru | 10 | Крупная выставочная площадка |
| 4 | Российский союз выставок и ярмарок | https://ruef.ru | 10 | Профильная ассоциация выставочной индустрии |
| 5 | UFI | https://www.ufi.org | 10 | Международная выставочная ассоциация |
| 6 | AEO | https://www.aeo.org.uk | 8 | Международная выставочная индустрия |
| 7 | EventLive | https://event-live.ru | 8 | Событийная индустрия, мероприятия |
| 8 | Event.ru | https://event.ru | 8 | Event-рынок и деловые мероприятия |
| 9 | Eventicious Blog | https://eventicious.com | 6 | Event tech и работа с посетителями |
| 10 | MICE&more | https://miceandmore.ru | 7 | MICE, деловые события, индустрия |
| 11 | Profi.Travel MICE | https://profi.travel | 6 | Деловой туризм, MICE |
| 12 | TAdviser Events | https://www.tadviser.ru | 6 | Деловые события и технологии |
| 13 | WorldFood Moscow | https://world-food.ru | 9 | Фуд-выставка, экспоненты, тренды |
| 14 | Продэкспо | https://www.prod-expo.ru | 9 | Ключевая фуд-выставка |
| 15 | Петерфуд | https://peterfood.ru | 10 | Профильный проект компании |
| 16 | Нева Байерсвик | https://nevabuyersweek.ru | 10 | Профильный проект компании |
| 17 | Агропродмаш | https://www.agroprodmash-expo.ru | 8 | Пищевая промышленность и оборудование |
| 18 | RosUpack | https://rosupack.com | 8 | Упаковка, FMCG, экспоненты |
| 19 | Meat & Poultry Industry Russia | https://meatindustry.ru | 7 | Мясная отрасль и поставщики |
| 20 | DairyTech | https://dairytech-expo.ru | 7 | Молочная индустрия |
| 21 | Seafood Expo Russia | https://seafoodexporussia.com | 7 | Рыбная отрасль, фуд |
| 22 | InterFood St. Petersburg | https://interfood-expo.ru | 7 | Фуд-выставка СПб |
| 23 | PIR Expo | https://pirexpo.com | 7 | HoReCa, продукты, поставщики |
| 24 | Coffee Tea Cacao Russian Expo | https://coffeeteacacaoexpo.ru | 6 | Продуктовая ниша, участники |
| 25 | Modern Bakery Moscow | https://modern-bakery.ru | 6 | Хлебопечение, кондитерка |
| 26 | Pharmtech & Ingredients | https://pharmtech-expo.ru | 7 | Фарма, оборудование, экспоненты |
| 27 | Здравоохранение / Russian Health Care Week | https://www.zdravo-expo.ru | 8 | Медицинская выставка |
| 28 | TIHE | https://tihe.uz | 5 | Медицинская выставка СНГ |
| 29 | MosBuild | https://mosbuild.com | 7 | Строительство, non-food |
| 30 | Interlight Russia | https://interlight-building.ru | 6 | Светотехника и smart building |
| 31 | HouseHold Expo | https://hhexpo.ru | 8 | Non-food, товары для дома |
| 32 | Kids Russia | https://kidsrussia.ru | 6 | Детские товары |
| 33 | Мир Детства | https://www.mirdetstva-expo.ru | 6 | Детские товары |
| 34 | Скрепка Экспо | https://skrepkaexpo.ru | 6 | Канцелярия, office products |
| 35 | BuyBrand Expo | https://buybrandexpo.com | 6 | Франчайзинг и ритейл |
| 36 | CPM | https://cpm-moscow.com | 6 | Fashion, non-food |
| 38 | Heimtextil Russia | https://heimtextil-russia.ru | 6 | Текстиль, non-food |
| 39 | Мебель | https://www.meb-expo.ru | 7 | Мебельный рынок |
| 40 | Мебельный бизнес | https://www.mebelshik.biz | 6 | Мебельная отрасль |
| 41 | FlowersExpo | https://www.flowers-expo.ru | 7 | Цветы, сад, закупки |
| 43 | Российская газета Бизнес | https://rg.ru/tema/ekonomika | 6 | Господдержка, бизнес |
| 44 | Минпромторг | https://minpromtorg.gov.ru | 7 | Поддержка промышленности и выставок |
| 45 | Торгово-промышленная палата РФ | https://tpprf.ru | 7 | Бизнес, выставки, поддержка |
| 46 | РЭЦ | https://www.exportcenter.ru | 7 | Экспорт, участие компаний в выставках |
| 47 | Business Event News | https://www.businesseventnews.com.au | 5 | Международная event-индустрия |
| 48 | Exhibition News | https://exhibitionnews.uk | 7 | Международные выставки |
| 49 | TSNN Trade Show News Network | https://www.tsnn.com | 7 | Международная выставочная индустрия |
| 50 | Exhibition World | https://www.exhibitionworld.co.uk | 8 | Международные выставки и организаторы |

## Конференции

| # | Источник | URL | Вес | Почему подходит |
|---|---|---:|---:|---|
| 1 | Vademecum | https://vademec.ru | 10 | Медицина, фарма, регулирование |
| 2 | Фармвестник | https://pharmvestnik.ru | 10 | Фармацевтический рынок |
| 3 | Remedium | https://remedium.ru | 9 | Фарма, медрынок, аналитика |
| 4 | Медвестник | https://medvestnik.ru | 9 | Медицина, врачи, регулирование |
| 5 | GxP News | https://gxpnews.net | 9 | Фарма, производство, качество |
| 6 | Катрен Стиль | https://www.katrenstyle.ru | 7 | Фарма и аптечный рынок |
| 8 | Минздрав РФ | https://minzdrav.gov.ru | 10 | Официальное регулирование |
| 9 | Росздравнадзор | https://roszdravnadzor.gov.ru | 10 | Надзор, медизделия, лекарства |
| 10 | Минпромторг | https://minpromtorg.gov.ru | 8 | Локализация, производство, медизделия |
| 11 | Правительство РФ | http://government.ru | 8 | Госполитика и постановления |
| 12 | Госдума | http://duma.gov.ru | 7 | Законопроекты и регулирование |
| 13 | Совет Федерации | http://council.gov.ru | 6 | Регуляторная повестка |
| 14 | regulation.gov.ru | https://regulation.gov.ru | 10 | Проекты нормативных актов |
| 15 | ГРЛС | https://grls.rosminzdrav.ru | 8 | Лекарства и регистрация |
| 16 | ЕЭК | https://eec.eaeunion.org | 8 | ЕАЭС, фарма, медизделия |
| 17 | РБК Здоровье | https://www.rbc.ru/health | 8 | Медицина и рынок |
| 18 | Коммерсантъ Фарма | https://www.kommersant.ru | 8 | Фарма и бизнес |
| 19 | Ведомости Здравоохранение | https://www.vedomosti.ru | 8 | Деловая медицина |
| 20 | Российская газета Здоровье | https://rg.ru/tema/zdorove | 7 | Официальная и медповестка |
| 21 | Интерфакс Здравоохранение | https://www.interfax.ru | 7 | Оперативные новости |
| 22 | ТАСС Здравоохранение | https://tass.ru/obschestvo | 7 | Официальная повестка |
| 23 | РИА Новости Здоровье | https://ria.ru/health | 6 | Общая медповестка |
| 24 | РБК Компании | https://companies.rbc.ru | 5 | Компании и отраслевые релизы |
| 25 | Ассоциация международных фармпроизводителей | https://aipm.org | 8 | Фарма, регулирование |
| 26 | Ассоциация российских фармпроизводителей | https://arfp.ru | 8 | Российская фарма |
| 27 | Союз профессиональных фармацевтических организаций | https://spfo.ru | 7 | Фармацевтический рынок |
| 29 | Ассоциация организаций клинических исследований | https://acto-russia.org | 7 | Клинические исследования |
| 30 | Сеченовский Университет | https://www.sechenov.ru | 6 | Медицинская наука и кадры |
| 32 | ФФОМС | https://www.ffoms.gov.ru | 7 | ОМС, финансирование медицины |
| 33 | ВШОУЗ | https://www.vshouz.ru | 7 | Управление здравоохранением |
| 34 | ЦНИИОИЗ | https://mednet.ru | 7 | Организация здравоохранения |
| 35 | НИУ ВШЭ Здравоохранение | https://www.hse.ru | 6 | Аналитика здравоохранения |
| 36 | MedTech Europe | https://www.medtecheurope.org | 7 | Международные медизделия |
| 37 | FDA Medical Devices | https://www.fda.gov/medical-devices | 7 | Международная регуляторика |
| 38 | EMA | https://www.ema.europa.eu | 7 | Европейская фармрегуляторика |
| 39 | WHO Health Topics | https://www.who.int | 7 | Глобальная медицина |
| 40 | Fierce Pharma | https://www.fiercepharma.com | 6 | Международная фарма |
| 41 | Fierce Healthcare | https://www.fiercehealthcare.com | 6 | Международное здравоохранение |
| 42 | PharmaTimes | https://www.pharmatimes.com | 6 | Фарма и рынок |
| 43 | BioPharma Dive | https://www.biopharmadive.com | 6 | Биофарма и рынок |
| 44 | MedCity News | https://medcitynews.com | 6 | Healthtech и медицина |
| 45 | Healthcare IT News | https://www.healthcareitnews.com | 6 | Digital health |
| 46 | HIMSS | https://www.himss.org | 6 | Digital health и конференции |
| 47 | Digital Health | https://www.digitalhealth.net | 6 | Цифровое здравоохранение |
| 48 | Becker's Hospital Review | https://www.beckershospitalreview.com | 5 | Управление клиниками |
| 49 | Health Affairs | https://www.healthaffairs.org | 5 | Политика здравоохранения |
| 50 | The Lancet Digital Health | https://www.thelancet.com/journals/landig | 5 | Цифровая медицина и исследования |

## ИИ

| # | Источник | URL | Вес | Почему подходит |
|---|---|---:|---:|---|
| 1 | OpenAI News | https://openai.com/news | 10 | OpenAI, продукты, модели, агенты |
| 2 | OpenAI Research | https://openai.com/research | 10 | Исследования и модели |
| 3 | Anthropic News | https://www.anthropic.com/news | 10 | Claude, enterprise AI, safety |
| 4 | Google DeepMind Blog | https://deepmind.google/discover/blog | 10 | AI research и продукты Google |
| 5 | Google AI Blog | https://blog.google/technology/ai | 9 | AI-продукты Google |
| 6 | Microsoft AI Blog | https://blogs.microsoft.com/ai | 9 | Copilot, enterprise AI |
| 7 | Microsoft Research AI | https://www.microsoft.com/en-us/research/research-area/artificial-intelligence | 8 | Исследования Microsoft |
| 8 | Meta AI Blog | https://ai.meta.com/blog | 9 | Llama, open models, research |
| 9 | NVIDIA Blog AI | https://blogs.nvidia.com/blog/category/deep-learning | 9 | AI infrastructure, enterprise AI |
| 10 | AWS Machine Learning Blog | https://aws.amazon.com/blogs/machine-learning | 8 | Enterprise AI и cloud |
| 11 | Google Cloud AI Blog | https://cloud.google.com/blog/products/ai-machine-learning | 8 | AI в бизнесе и cloud |
| 12 | Azure AI Blog | https://azure.microsoft.com/en-us/blog/topics/ai-machine-learning | 8 | Enterprise AI |
| 13 | IBM Research AI | https://research.ibm.com/artificial-intelligence | 7 | Enterprise AI и research |
| 14 | Salesforce AI Blog | https://www.salesforce.com/news/stories/category/ai | 7 | AI для продаж и CRM |
| 15 | Adobe AI | https://blog.adobe.com/en/topics/ai | 7 | Generative AI для контента |
| 16 | Hugging Face Blog | https://huggingface.co/blog | 9 | Open-source модели и инструменты |
| 17 | Mistral AI News | https://mistral.ai/news | 8 | LLM и enterprise AI |
| 18 | Cohere Blog | https://cohere.com/blog | 7 | Enterprise LLM |
| 19 | Perplexity Blog | https://www.perplexity.ai/hub/blog | 7 | AI search и продукты |
| 20 | LangChain Blog | https://blog.langchain.com | 8 | AI agents, orchestration |
| 21 | LlamaIndex Blog | https://www.llamaindex.ai/blog | 8 | RAG, agents, enterprise use |
| 22 | Pinecone Blog | https://www.pinecone.io/blog | 7 | Vector search, RAG |
| 23 | Weaviate Blog | https://weaviate.io/blog | 7 | Vector databases, RAG |
| 24 | Replicate Blog | https://replicate.com/blog | 6 | AI models and deployment |
| 25 | TechCrunch AI | https://techcrunch.com/category/artificial-intelligence | 9 | AI startups and products |
| 26 | The Verge AI | https://www.theverge.com/ai-artificial-intelligence | 8 | AI products and industry |
| 27 | VentureBeat AI | https://venturebeat.com/category/ai | 8 | Enterprise AI |
| 28 | The Decoder | https://the-decoder.com | 8 | AI industry coverage |
| 29 | MIT Technology Review AI | https://www.technologyreview.com/topic/artificial-intelligence | 8 | AI analysis |
| 30 | Wired AI | https://www.wired.com/tag/artificial-intelligence | 7 | AI and technology |
| 31 | IEEE Spectrum AI | https://spectrum.ieee.org/artificial-intelligence | 7 | Technical AI coverage |
| 32 | Ars Technica AI | https://arstechnica.com/tag/artificial-intelligence | 7 | Tech analysis |
| 33 | ZDNET AI | https://www.zdnet.com/topic/artificial-intelligence | 7 | Business AI and tools |
| 34 | The Information AI | https://www.theinformation.com | 7 | Tech business analysis |
| 35 | Semafor Technology | https://www.semafor.com/vertical/technology | 6 | Tech and AI business |
| 36 | CNBC Tech | https://www.cnbc.com/technology | 6 | Public companies and AI |
| 37 | Reuters Technology | https://www.reuters.com/technology | 7 | Verified business news |
| 38 | Bloomberg Technology | https://www.bloomberg.com/technology | 7 | AI market and companies |
| 39 | Financial Times Technology | https://www.ft.com/technology | 7 | AI business and regulation |
| 40 | The Economist Technology Quarterly | https://www.economist.com/technology-quarterly | 6 | Strategic technology analysis |
| 41 | Хабр AI | https://habr.com/ru/hubs/artificial_intelligence/articles | 7 | Русскоязычные AI-кейсы |
| 42 | Хабр ML | https://habr.com/ru/hubs/machine_learning/articles | 7 | ML and engineering |
| 43 | VC.ru AI | https://vc.ru/tag/ai | 6 | Российский бизнес и AI |
| 44 | TAdviser AI | https://www.tadviser.ru | 7 | Российский enterprise IT/AI |
| 45 | CNews AI | https://www.cnews.ru | 7 | Российский ИТ-рынок |
| 46 | ComNews | https://www.comnews.ru | 6 | Telecom, IT, AI infrastructure |
| 47 | РБК Технологии | https://www.rbc.ru/technology_and_media | 7 | Российский tech/business |
| 48 | Коммерсантъ Hi-Tech | https://www.kommersant.ru/theme/hi-tech | 7 | Российская tech-повестка |
| 49 | Ведомости Технологии | https://www.vedomosti.ru/technology | 7 | Tech and business |
| 50 | Stanford HAI | https://hai.stanford.edu/news | 6 | AI policy and research |

## Рекомендация по внедрению

1. Использовать этот каталог как whitelist доменов для DDGS.
2. Для каждого направления сначала искать по `searchQueries`, затем оставлять только материалы с доменов из соответствующего списка.
3. Основные источники с весом `9-10` должны иметь больший приоритет.
4. Материалы вне whitelist не должны попадать в digest без дополнительного совпадения по сильным ключевым словам.
5. Для направлений `retail`, `exhibitions`, `conferences` русскоязычные источники должны иметь приоритет над глобальными, кроме случаев международных отраслевых трендов.
