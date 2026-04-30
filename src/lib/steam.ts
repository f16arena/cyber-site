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

/**
 * Проверяет подлинность OpenID-ответа от Steam.
 * Возвращает Steam ID (64-битное число) при успехе, null при провале.
 */
export async function verifySteamOpenId(
  searchParams: URLSearchParams
): Promise<string | null> {
  const claimedId = searchParams.get("openid.claimed_id");
  if (!claimedId) return null;

  // Проверяем формат claimed_id — должен быть https://steamcommunity.com/openid/id/<steamid>
  const steamIdMatch = claimedId.match(
    /^https:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/
  );
  if (!steamIdMatch) return null;
  const steamId = steamIdMatch[1];

  // Делаем check_authentication запрос обратно к Steam
  const verifyParams = new URLSearchParams();
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith("openid.")) {
      verifyParams.set(key, value);
    }
  }
  verifyParams.set("openid.mode", "check_authentication");

  const response = await fetch(STEAM_OPENID_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: verifyParams.toString(),
  });

  const text = await response.text();
  if (!text.includes("is_valid:true")) return null;

  return steamId;
}

export type SteamPlayerSummary = {
  steamId: string;
  personaName: string;
  avatarUrl: string;
  profileUrl: string;
  countryCode?: string;
};

/**
 * Получает публичный профиль Steam-пользователя через Web API.
 */
export async function fetchSteamProfile(
  steamId: string
): Promise<SteamPlayerSummary | null> {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) {
    throw new Error("STEAM_API_KEY is not set");
  }

  const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;

  const data = (await response.json()) as {
    response: {
      players: Array<{
        steamid: string;
        personaname: string;
        avatarfull: string;
        profileurl: string;
        loccountrycode?: string;
      }>;
    };
  };

  const player = data.response.players[0];
  if (!player) return null;

  return {
    steamId: player.steamid,
    personaName: player.personaname,
    avatarUrl: player.avatarfull,
    profileUrl: player.profileurl,
    countryCode: player.loccountrycode,
  };
}
