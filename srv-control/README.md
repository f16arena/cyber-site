# f16-srv-control

Маленький Fastify-сервис который живёт на домашнем ПК и связывает F16 Arena (Vercel) с CS2 dedicated server.

## Что делает

1. **POST /server/:id/rcon** — принимает HMAC-подписанные RCON-команды от Vercel (restart_round, kick, change_map и т.д.), исполняет на локальном srcds, возвращает ответ.
2. **POST /matchzy/webhook** — принимает события матча от MatchZy (mp_match_end и т.д.), пересылает в Vercel webhook со своей подписью.
3. **GET /health** — health check.
4. **GET /demos/:matchId** — (TODO Phase 6b) отдаёт `.dem` файл по signed URL.

## Зависимости

- Node.js 20+
- CS2 dedicated server установленный локально с rcon_password в server.cfg
- Cloudflare Tunnel (см. `../HOME_SERVER_SETUP.md`)

## Установка

```cmd
cd C:\f16arena
git clone https://github.com/f16arena/cyber-site.git
cd cyber-site\srv-control
npm install
copy .env.example .env
notepad .env
```

Заполнить `.env`:
- `SHARED_SECRET` — длинная случайная строка, совпадает с `SRV_CONTROL_SECRET` в Vercel env
- `VERCEL_WEBHOOK_URL` — `https://<твой-домен>/api/internal/match-result`
- `VERCEL_WEBHOOK_SECRET` — длинная случайная строка, совпадает с `MATCHZY_WEBHOOK_SECRET` в Vercel env
- `SERVERS_JSON` — массив серверов, минимум один с правильным rcon-паролем

## Запуск

### Dev

```cmd
npm run dev
```

### Production (build + run)

```cmd
npm run build
npm start
```

### Production как Windows service (через NSSM)

1. Скачать https://nssm.cc/download
2. ```cmd
   nssm.exe install f16-srv-control "C:\Program Files\nodejs\node.exe"
   ```
3. В GUI указать:
   - Path: `C:\Program Files\nodejs\node.exe`
   - Startup directory: `C:\f16arena\cyber-site\srv-control`
   - Arguments: `dist\index.js`
4. Service → Startup type: Automatic
5. Start the service

## Проверка

```cmd
curl http://localhost:3001/health
```

Должно вернуть `{"ok":true,"servers":N}`.

Через Cloudflare Tunnel:
```cmd
curl https://srv-api.<твой-домен>.kz/health
```

## Безопасность

- Слушает только `127.0.0.1` — наружу не торчит.
- Все запросы (кроме `/health`) требуют HMAC-подпись через `X-F16-Signature` заголовок.
- RCON-пароли в env, в logs не выводятся.
- MatchZy webhook требует `Authorization: Bearer <SHARED_SECRET>`.

## Следующий шаг

Phase 6b: интеграция в админ-панели сайта (`/admin/servers/[id]`) для кнопок RCON-команд и live-консоли через SSE.
