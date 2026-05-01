# Esports.kz

> Платформа-сообщество для киберспорта Казахстана. Турниры по CS2, Dota 2 и PUBG, поиск тиммейтов, командные чаты, лидерборды, мировые новости.

🌐 **Прод:** https://cyber-site-five.vercel.app

---

## Стек

- **Frontend + Backend:** Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- **DB:** PostgreSQL (Supabase) + Prisma 6
- **Auth:** Steam OpenID 2.0 + iron-session (encrypted cookies)
- **i18n:** next-intl (RU / KK / EN)
- **Storage:** Supabase Storage (логотипы, аватары, баннеры)
- **Email:** Resend
- **Push:** Web Push API (Service Worker + VAPID)
- **Hosting:** Vercel
- **Шрифты:** Unbounded (display) + Geist Sans (body) + JetBrains Mono

---

## Документация

| Файл | О чём |
|---|---|
| [`TZ.md`](./TZ.md) | Полное ТЗ проекта: фичи, этапы, риски |
| [`TZ_TEAMS.md`](./TZ_TEAMS.md) | Архитектура команд (Team-per-game vs Squad vs Organization) |
| [`TZ_SERVERS.md`](./TZ_SERVERS.md) | ТЗ для своих CS2-серверов с минимальным пингом |

---

## Локальный запуск

```bash
# 1. Зависимости
npm install

# 2. Настроить .env (см. секцию env vars ниже)
cp .env.example .env
# заполнить значения

# 3. Применить миграции БД
npx prisma migrate dev

# 4. (опционально) засеять демо-данными
npm run seed

# 5. Запустить dev-сервер
npm run dev
```

Открой [http://localhost:3000](http://localhost:3000).

---

## Env vars

| Переменная | Назначение | Обязательно? |
|---|---|---|
| `DATABASE_URL` | Postgres pooler (порт 6543, transaction mode) | ✅ |
| `DIRECT_URL` | Postgres direct (для миграций), pooler 5432 | ✅ |
| `SESSION_SECRET` | iron-session ключ (минимум 32 байта base64) | ✅ |
| `STEAM_API_KEY` | Steam Web API (профили, аватары) | ✅ |
| `SITE_URL` | Полный URL сайта (для Steam OpenID realm) | ✅ |
| `ADMIN_STEAM_IDS` | Список Steam ID админов через запятую | ✅ |
| `SUPABASE_URL` | URL Supabase проекта | ⚠ для загрузки картинок |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key (секрет) | ⚠ для загрузки картинок |
| `RESEND_API_KEY` | Email-уведомления | ⚠ для email |
| `RESEND_FROM` | Email-адрес отправителя | ⚠ |
| `DEEPL_API_KEY` | Автоперевод мировых новостей | ⚠ для перевода |
| `FACEIT_API_KEY` | Импорт CS2-матчей с FACEIT | ⚠ для FACEIT |
| `OPENDOTA_API_KEY` | Импорт Dota 2 матчей | ⚠ опц. (без ключа лимит 60/мин) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push public key | ⚠ для push |
| `VAPID_PRIVATE_KEY` | Web Push private key | ⚠ для push |
| `VAPID_SUBJECT` | mailto: для VAPID | ⚠ для push |
| `CRON_SECRET` | Защита cron job для очистки чата | ⚠ опц. |

Без опциональных ключей соответствующие фичи просто отключаются (без падения).

---

## Структура проекта

```
.
├── i18n/                  # next-intl config (request, routing, navigation)
├── messages/              # переводы ru.json, kk.json, en.json
├── prisma/
│   ├── schema.prisma      # модель БД (20+ моделей)
│   ├── migrations/        # история миграций
│   └── seed.ts            # демо-данные (8 юзеров, 5 команд, турнир)
├── public/
│   ├── sw.js              # Service Worker (Web Push)
│   └── og-default.png     # дефолтная OG картинка
├── src/
│   ├── app/
│   │   ├── [locale]/      # все публичные страницы (3-язычные)
│   │   │   ├── page.tsx           # главная (HLTV-style)
│   │   │   ├── tournaments/       # /tournaments, /tournaments/[slug]
│   │   │   ├── matches/           # /matches, /matches/[id]
│   │   │   ├── teams/             # /teams, /teams/[tag], /teams/[tag]/edit, /teams/[tag]/chat
│   │   │   ├── players/           # LFG-лента + публичные профили
│   │   │   ├── messages/          # /messages, /messages/[userId] (1-на-1 чат)
│   │   │   ├── friends/           # друзья
│   │   │   ├── leaderboard/       # Top Players / Teams / MVP
│   │   │   ├── news/              # локальные новости
│   │   │   ├── world-news/        # мировые трансферы/результаты (с автопереводом)
│   │   │   ├── sponsors/          # спонсоры
│   │   │   └── profile/           # /profile, /profile/edit
│   │   ├── admin/         # кабинет суперадмина (БЕЗ локали — только русский)
│   │   ├── api/           # серверные роуты
│   │   │   ├── auth/steam/        # Steam OpenID flow
│   │   │   ├── search/            # глобальный поиск
│   │   │   ├── notifications/     # in-app уведомления
│   │   │   ├── messages/          # polling 1-на-1 чата
│   │   │   ├── team-messages/     # polling командного чата
│   │   │   ├── push/subscribe/    # Web Push subscribe/unsubscribe
│   │   │   └── cron/purge-messages/ # автоочистка чата (24h)
│   │   ├── opengraph-image.tsx   # динамическая OG картинка для шеринга
│   │   └── layout.tsx
│   ├── components/        # SiteHeader, UserMenu, AdminSidebar, NotificationsBell, MarketTicker, GlobalSearch, MobileMenu, LanguageSwitcher, PushManager, ImageUploader
│   ├── lib/               # prisma, session, steam, storage, email, push, market, translate, conversations, bracket, games, notifications
│   └── middleware.ts      # next-intl + path-based locale
├── next.config.ts         # с next-intl plugin
└── vercel.json            # cron config
```

---

## Ключевые фичи

### Для игроков
- 🎮 Steam-логин через OpenID
- 👤 Профиль с тегами CS2/Dota/PUBG, ролью, рангом, регионом, био
- 📷 Загрузка аватара (или из Steam)
- 👥 Друзья, личные сообщения с автоочисткой 24h
- 🛡 Команды: открытые (instant join) или закрытые (с одобрением капитана)
- 💬 Командный чат + 1-на-1
- 🔍 LFG-лента: «ищу команду» с фильтрами (игра/регион/роль)
- 🔔 In-app + email + Web Push уведомления
- 🌐 Мультиязычность: RU / KK / EN

### Для команд
- Создание команды с лого, описанием, регионом
- Размер составов: CS2 5+2, Dota 5+2, PUBG 4+2 (запасные автоматом)
- Капитан управляет: загружает лого, редактирует, выгоняет, принимает заявки
- Invite-ссылка
- Командная статистика: win rate, по картам, история турниров

### Для игроков уровня pro
- HLTV-style профиль: 12 stat-карточек (Rating 2.0, K/D, ADR, HS%, KAST, KPR/DPR/APR)
- Multikills (2K/3K/4K/5K) и клатчи (1v1/1v2)
- Per-map breakdown с прогресс-барами
- MVP-награды
- Recent form (последние 10 матчей)

### Для турниров
- Создание турнира + загрузка баннера
- Шаблоны (сохранил настройки → переиспользуй)
- **Автогенерация Double Elimination сетки** для 4/8/16 команд
- Визуальная сетка (UB + LB колонки)
- Подтверждение результата обеими командами (если совпадает — auto, если нет — DISPUTED)
- MVP-награды и статистика игроков
- Автопродвижение победителя по сетке

### Интеграции
- **FACEIT API** — авто-импорт CS2 матчей (счёт, K/D/A, ADR, HS%, MVP)
- **OpenDota API** — авто-импорт Dota 2 матчей (KDA, GPM/XPM, hero damage, MVP)
- **Steam Web API** — профили игроков
- **DeepL API** — автоперевод мировых новостей на 3 языка

### Маркет-ticker
- Прокручивающаяся полоса в шапке: курсы валют + цены 6 популярных CS2-скинов
- Источники: open.er-api.com (валюты, бесплатно), Steam Market API (скины)
- Кеш 1 час

### Кабинет суперадмина
- Sidebar с 6 секциями
- Управление: турниры, матчи, команды, игроки, сезоны, новости, мировые новости, спонсоры, заявки от спонсоров, лидерборды, настройки
- Везде — bulk операции, удаление, редактирование, загрузка картинок

---

## Команды

```bash
npm run dev          # dev-сервер
npm run build        # production build
npm run start        # production start
npm run lint         # ESLint
npm run seed         # засеять демо-данными
```

```bash
# Prisma
npx prisma migrate dev --name <name>   # создать + применить миграцию
npx prisma migrate deploy              # применить на проде (с локалки)
npx prisma generate                     # сгенерить Prisma Client
npx prisma studio                       # GUI для БД
```

---

## Деплой на Vercel

1. GitHub → push в `main`
2. Vercel автоматически собирает и деплоит
3. ⚠ Миграции БД не запускаются на билде (исключено намеренно). Применять с локалки:
   ```bash
   npx prisma migrate deploy
   ```
4. Все env vars должны быть в Vercel Settings → Environment Variables
5. После первого деплоя добавить `SITE_URL=https://<your-domain>` и сделать Redeploy

---

## Лицензия

Проприетарный проект. Все права защищены.

---

## Контакты

- Email: f16arena@gmail.com
- GitHub: [@f16arena](https://github.com/f16arena)
