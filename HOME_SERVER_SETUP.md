# Phase 0b — Установка домашнего CS2-сервера

Гайд по поднятию инфраструктуры F16 Arena на твоём домашнем ПК (Windows 11) для проведения турниров в комп-клубе.

**Что получится в результате:**
- CS2 dedicated server с MatchZy plugin — игроки коннектятся по `connect 192.168.X.X:27015`
- Node-сервис `srv-control` на port 3001 — принимает RCON-команды от Vercel
- Cloudflare Tunnel прокидывает `srv-api.<твой-домен>.kz` → `localhost:3001`
- Match results автоматически прилетают в Vercel через webhook

---

## 1. Подготовка системы

### 1.1. Создать папку проекта

```cmd
mkdir C:\f16arena
cd C:\f16arena
```

### 1.2. Установить Node.js 20 LTS

Скачать с https://nodejs.org/en/download (Windows Installer 64-bit). После установки проверить:

```cmd
node --version
npm --version
```

### 1.3. Установить Git (если нет)

https://git-scm.com/download/win — стандартная установка.

---

## 2. CS2 Dedicated Server

### 2.1. SteamCMD

1. Скачать https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip
2. Распаковать в `C:\steamcmd`
3. Запустить `C:\steamcmd\steamcmd.exe` один раз — он скачает обновления.

### 2.2. Установка CS2 server

```cmd
C:\steamcmd\steamcmd.exe +force_install_dir C:\cs2-server +login anonymous +app_update 730 validate +quit
```

~40 ГБ загрузки, ~30 минут.

### 2.3. GSLT (Steam Game Server Login Token)

1. Открыть https://steamcommunity.com/dev/managegameservers
2. Войти своим Steam-аккаунтом (нужен Steam Guard на 15+ дней)
3. **App ID:** `730` (это CS2)
4. **Memo:** `f16-arena-1`
5. Получить token. Записать его — понадобится дальше.

### 2.4. Тестовый запуск

```cmd
C:\cs2-server\game\bin\win64\cs2.exe -dedicated +map de_dust2 -port 27015 +sv_setsteamaccount <ВАШ-GSLT>
```

Открыть CS2 на другом ПК в той же сети, в консоли:
```
connect 192.168.X.X:27015
```

Должен подключиться. Закрыть сервер `Ctrl+C`.

---

## 3. MatchZy (Pug Match Plugin)

MatchZy превращает срвер в pug-match сервер с поддержкой команд, результатов через webhook, ready-check.

### 3.1. Metamod

1. Скачать https://www.sourcemm.net/downloads.php (Windows последний билд CS2-совместимый)
2. Распаковать `metamod` в `C:\cs2-server\game\csgo\` (должно появиться `C:\cs2-server\game\csgo\addons\metamod\`)

### 3.2. CounterStrikeSharp

1. Скачать https://github.com/roflmuffin/CounterStrikeSharp/releases/latest (Windows zip — `counterstrikesharp-with-runtime-build-XXX-windows-XXX.zip`)
2. Распаковать содержимое `addons/` в `C:\cs2-server\game\csgo\addons\`

### 3.3. MatchZy plugin

1. Скачать https://github.com/shobhit-pathak/MatchZy/releases/latest (Windows zip)
2. Распаковать в `C:\cs2-server\game\csgo\addons\counterstrikesharp\plugins\MatchZy\`

### 3.4. server.cfg

Создать `C:\cs2-server\game\csgo\cfg\server.cfg`:

```cfg
hostname "F16 Arena | Match"
rcon_password "СГЕНЕРИРУЙ-ОЧЕНЬ-ДЛИННЫЙ-РАНДОМ-СЮДА"
sv_password ""

// MatchZy подхватит match config через RCON команду matchzy_loadmatch_url
sv_logfile 1
log on
tv_enable 1
tv_autorecord 1

mp_friendlyfire 0
mp_autoteambalance 0
mp_limitteams 0
mp_match_can_clinch 1
mp_match_end_changelevel 0
```

⚠️ Замени `rcon_password` на длинную случайную строку (минимум 32 символа). Эту строку потом введёшь в админке `/admin/servers`.

### 3.5. Webhook URL для MatchZy

В файле `C:\cs2-server\game\csgo\addons\counterstrikesharp\plugins\MatchZy\config\config.json`:

```json
{
  "matchzy_remote_log_url": "https://<твой-домен>.kz/api/internal/match-result",
  "matchzy_remote_log_header_key": "Authorization",
  "matchzy_remote_log_header_value": "Bearer <SHARED-SECRET>"
}
```

`SHARED-SECRET` — длинная случайная строка. Эту же строку добавишь в env Vercel как `MATCHZY_WEBHOOK_SECRET`.

---

## 4. srv-control (Node Fastify сервис)

Этот сервис принимает RCON-команды от Vercel и транслирует на CS2 srcds. См. `srv-control/` директория в репо (Phase 6b — будет создана позже).

Пока что заглушка — реальный код Phase 6b.

---

## 5. Cloudflare Tunnel

### 5.1. Купить домен (если нет)

Можно купить `.kz` через https://hoster.kz или `.com/.org` через namecheap. Бюджет $5-30/год.

### 5.2. Подключить домен к Cloudflare

1. Зарегистрироваться на https://cloudflare.com (бесплатно).
2. Add Site → ввести свой домен.
3. Cloudflare выдаст 2 nameserver'а — пропишешь их у регистратора домена.

### 5.3. Создать туннель

1. Скачать `cloudflared.exe` https://github.com/cloudflare/cloudflared/releases/latest (Windows AMD64)
2. Положить в `C:\cloudflared\`
3. В cmd:
   ```cmd
   cd C:\cloudflared
   cloudflared.exe tunnel login
   ```
   Откроется браузер — выбери свой домен, авторизуй.

4. Создать туннель:
   ```cmd
   cloudflared.exe tunnel create f16-arena-srv
   ```
   Запиши `tunnel-id` из вывода.

5. Создать конфиг `C:\Users\<твой-юзер>\.cloudflared\config.yml`:
   ```yaml
   tunnel: <tunnel-id>
   credentials-file: C:\Users\<твой-юзер>\.cloudflared\<tunnel-id>.json
   ingress:
     - hostname: srv-api.<твой-домен>.kz
       service: http://localhost:3001
     - service: http_status:404
   ```

6. DNS-привязка:
   ```cmd
   cloudflared.exe tunnel route dns f16-arena-srv srv-api.<твой-домен>.kz
   ```

7. Запуск туннеля:
   ```cmd
   cloudflared.exe tunnel run f16-arena-srv
   ```

   Проверка с другого устройства: `curl https://srv-api.<твой-домен>.kz/health` — должно ответить 404 (потому что srv-control ещё не запущен).

### 5.4. Cloudflared как Windows-сервис

Чтобы туннель работал постоянно (даже после ребута):

```cmd
cloudflared.exe service install
```

В диспетчере служб (services.msc) проверь что `Cloudflare Tunnel` Auto + Running.

---

## 6. Файрволл Windows

### 6.1. Открыть UDP 27015-27020 для LAN

В Windows Defender Firewall:
- **Inbound Rules** → New Rule
- **Port** → UDP → `27015-27020`
- **Allow** → ✓ Domain ✓ Private (только LAN, БЕЗ Public)
- Name: `CS2 Game Servers`

### 6.2. Закрыть TCP 3001

Сервис `srv-control` слушает только localhost — Cloudflare Tunnel пробрасывает извне. Никаких inbound правил для 3001 не нужно.

---

## 7. Проверочный чек-лист

После Phase 6b будет так:

- [ ] `cloudflared.exe tunnel run` запущен (или Windows service)
- [ ] `node srv-control/dist/index.js` запущен (port 3001)
- [ ] `C:\cs2-server\game\bin\win64\cs2.exe -dedicated ...` запущен
- [ ] `curl https://srv-api.<твой-домен>.kz/health` отвечает 200
- [ ] В `/admin/servers` (на сайте F16 Arena) добавлена запись сервера с LAN-IP, port 27015, rcon-password
- [ ] Тестовый матч: capитан жмёт "Подключиться" → `steam://connect/192.168.X.Y:27015/<pass>` → CS2 запускается и коннектится

---

## 8. Альтернативы (если что-то не подходит)

### 8.1. Без Cloudflare Tunnel — белый IP

Если домен/Cloudflare кажется сложным, можно:
- Запросить у провайдера (Beeline) статический белый IP (1500₸/мес)
- В роутере прокинуть TCP 3001 на свой ПК
- Поднять самоподписанный SSL или Caddy (auto Let's Encrypt) на 3001

Но Cloudflare Tunnel проще: не нужен белый IP, есть TLS из коробки.

### 8.2. WSL2 Ubuntu

Если родной Windows-build CS2 будет глючить — поставить WSL2 Ubuntu и крутить srcds внутри. MatchZy под Linux тоже работает. Но игроки в LAN-сети не смогут подключаться напрямую к WSL2 (другая подсеть) — придётся пробрасывать порты, что усложняет setup.

Лучше всего сразу нативный Windows.

### 8.3. Аренда VPS вместо дома

PS.kz Алматы (2 vCPU/4GB) ~7000₸/мес — белый IP в комплекте, DDoS-защита, 24/7 uptime. Если домашний сетап будет проблемный — это backup-вариант. См. `TZ_SERVERS.md` для деталей.

---

## 9. Что дальше (Phase 6b)

Когда инфра поднята:
1. В админке `/admin/servers` создать запись сервера (LAN-IP + port + rcon-password — будет зашифрован AES-GCM на стороне Vercel через `SERVER_ENCRYPTION_KEY` env).
2. Запустить тестовый матч с двумя командами:
   - admin/matches/[id]/start-veto → captains делают pick/ban → veto-engine закрывает выбор карт
   - admin/matches/[id]/allocate-server → Vercel посылает MatchZy config на srv-control, srv-control делает `rcon matchzy_loadmatch_url <signed-url>`
   - Игроки получают `steam://connect/192.168.X.X:27015/<pwd>`
   - Играют → MatchZy шлёт webhook → Vercel парсит результат → обновляет статы и сетку
3. Admin server control panel (Phase 8): RCON-кнопки (restart_round, kick, change_map) — все идут через srv-control.

---

*Гайд живёт. Если какие-то шаги не получаются — отпишите в issue.*
