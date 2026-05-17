const STEAM_OPENID_URL = "https://steamcommunity.com/openid/login";

/**
 * Строит URL для редиректа на Steam OpenID логин.
 * Steam после логина вернёт пользователя на returnTo с openid.* параметрами.
 */
export function getSteamLoginUrl(returnTo: string, realm: string) {
  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": realm,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });
  return `${STEAM_OPENID_URL}?${params.toString()}`;
}

export type VerifyResult =
  | { ok: true; steamId: string }
  | {
      ok: false;
      reason:
        | "no_claimed_id"
        | "bad_claimed_id_format"
        | "verify_fetch_failed"
        | "verify_invalid";
      detail?: string;
    };

/**
 * Проверяет подлинность OpenID-ответа от Steam.
 */
export async function verifySteamOpenId(
  searchParams: URLSearchParams
): Promise<VerifyResult> {
  const claimedId = searchParams.get("openid.claimed_id");
  if (!claimedId) return { ok: false, reason: "no_claimed_id" };

  const steamIdMatch = claimedId.match(
    /^https:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/
  );
  if (!steamIdMatch) {
    return { ok: false, reason: "bad_claimed_id_format", detail: claimedId };
  }
  const steamId = steamIdMatch[1];

  const verifyParams = new URLSearchParams();
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith("openid.")) {
      verifyParams.set(key, value);
    }
  }
  verifyParams.set("openid.mode", "check_authentication");

  let response: Response;
  try {
    response = await fetch(STEAM_OPENID_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: verifyParams.toString(),
    });
  } catch (e) {
    return {
      ok: false,
      reason: "verify_fetch_failed",
      detail: (e as Error).message,
    };
  }

  const text = await response.text();
  if (!text.includes("is_valid:true")) {
    return { ok: false, reason: "verify_invalid", detail: text.slice(0, 200) };
  }
  return { ok: true, steamId };
}

export type SteamPlayerSummary = {
  steamId: string;
  personaName: string;
  avatarUrl: string;
  profileUrl: string;
  countryCode?: string;
};

export type FetchProfileResult =
  | { ok: true; profile: SteamPlayerSummary }
  | {
      ok: false;
      reason:
        | "no_api_key"
        | "fetch_failed"
        | "http_error"
        | "empty_players"
        | "parse_failed";
      detail?: string;
      httpStatus?: number;
    };

/**
 * Получает публичный профиль Steam-пользователя через Web API.
 * Возвращает структурированный результат — никогда не бросает.
 */
export async function fetchSteamProfile(
  steamId: string
): Promise<FetchProfileResult> {
  const apiKey = process.env.STEAM_API_KEY?.trim();
  if (!apiKey) return { ok: false, reason: "no_api_key" };

  const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${encodeURIComponent(
    apiKey
  )}&steamids=${encodeURIComponent(steamId)}`;

  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch (e) {
    return { ok: false, reason: "fetch_failed", detail: (e as Error).message };
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    return {
      ok: false,
      reason: "http_error",
      httpStatus: response.status,
      detail: text.slice(0, 200),
    };
  }

  let data: {
    response?: {
      players?: Array<{
        steamid: string;
        personaname: string;
        avatarfull: string;
        profileurl: string;
        loccountrycode?: string;
      }>;
    };
  };
  try {
    data = await response.json();
  } catch (e) {
    return { ok: false, reason: "parse_failed", detail: (e as Error).message };
  }

  const player = data.response?.players?.[0];
  if (!player) {
    return { ok: false, reason: "empty_players" };
  }

  return {
    ok: true,
    profile: {
      steamId: player.steamid,
      personaName: player.personaname,
      avatarUrl: player.avatarfull,
      profileUrl: player.profileurl,
      countryCode: player.loccountrycode,
    },
  };
}
