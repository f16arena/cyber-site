const ERROR_TITLE: Record<string, string> = {
  invalid: "Не удалось проверить вход Steam",
  profile: "Не удалось получить профиль Steam",
};

const REASON_TEXT: Record<string, string> = {
  no_claimed_id: "Steam не вернул claimed_id (флоу прерван).",
  bad_claimed_id_format: "Steam вернул неверный формат claimed_id.",
  verify_fetch_failed:
    "Не удалось связаться с steamcommunity.com (сетевая ошибка с сервера).",
  verify_invalid:
    "Steam отклонил проверку. Часто из-за неверного SITE_URL/realm — он должен совпадать с доменом, на который происходит редирект.",
  no_api_key:
    "На сервере не задан STEAM_API_KEY. Получите ключ на https://steamcommunity.com/dev/apikey и пропишите в env.",
  fetch_failed: "Сервер не смог отправить запрос к Steam Web API.",
  http_error:
    "Steam Web API вернул ошибку — обычно невалидный STEAM_API_KEY или превышен лимит.",
  empty_players:
    "Steam вернул пустой ответ — возможно, профиль приватный или скрыт.",
  parse_failed: "Ответ Steam Web API не распарсился.",
};

export function AuthErrorBanner({
  authError,
  reason,
  detail,
}: {
  authError?: string;
  reason?: string;
  detail?: string;
}) {
  if (!authError) return null;
  const title = ERROR_TITLE[authError] ?? "Ошибка входа";
  const text = reason ? REASON_TEXT[reason] : undefined;

  return (
    <div className="mx-auto max-w-7xl px-6 mt-4">
      <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-5 py-4">
        <div className="text-sm font-bold text-rose-200">{title}</div>
        {text && <div className="text-sm text-rose-100/80 mt-1">{text}</div>}
        {(reason || detail) && (
          <div className="text-[11px] font-mono text-rose-200/60 mt-2 break-all">
            {reason && <>code: <code>{reason}</code></>}
            {detail && <> · detail: <code>{detail}</code></>}
          </div>
        )}
      </div>
    </div>
  );
}
