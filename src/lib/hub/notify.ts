/**
 * Discord webhook + Telegram bot нотификации hub-событий.
 *
 * Конфиг через env:
 *  - DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/.../...
 *  - TELEGRAM_BOT_TOKEN=<bot token from @BotFather>
 *  - TELEGRAM_CHAT_ID=<id чата, можно у @userinfobot>
 *
 * Если переменная пустая — соответствующий канал просто пропускается.
 * Сетевые ошибки никогда не пробрасываются — log + return.
 *
 * Использование:
 *   notifyMatchStarted({ matchId, map, connectString, teamA, teamB })
 *   notifyMatchFinished({ matchId, winner, scoreA, scoreB })
 */

type DiscordEmbed = {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  timestamp?: string;
};

async function sendDiscord(payload: {
  content?: string;
  embeds?: DiscordEmbed[];
}) {
  const url = process.env.DISCORD_WEBHOOK_URL?.trim();
  if (!url) return;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error("[hub:notify:discord] HTTP", res.status, await res.text());
    }
  } catch (e) {
    console.error("[hub:notify:discord] failed:", (e as Error).message);
  }
}

async function sendTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return;
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      console.error("[hub:notify:telegram] HTTP", res.status, await res.text());
    }
  } catch (e) {
    console.error("[hub:notify:telegram] failed:", (e as Error).message);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function notifyMatchStarted(input: {
  matchId: string;
  map: string;
  connectString: string;
  teamA: string[]; // usernames
  teamB: string[];
}) {
  const idShort = input.matchId.slice(0, 8);
  const teamAStr = input.teamA.join(", ");
  const teamBStr = input.teamB.join(", ");

  await Promise.all([
    sendDiscord({
      embeds: [
        {
          title: `🎯 Матч #${idShort} начался`,
          description: `Карта **${input.map}**\n\`${input.connectString}\``,
          color: 0xf97316,
          fields: [
            { name: "Team A", value: teamAStr || "—", inline: true },
            { name: "Team B", value: teamBStr || "—", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    }),
    sendTelegram(
      `🎯 <b>Матч #${escapeHtml(idShort)} начался</b>\n` +
        `Карта: <b>${escapeHtml(input.map)}</b>\n` +
        `Connect: <code>${escapeHtml(input.connectString)}</code>\n` +
        `Team A: ${escapeHtml(teamAStr)}\n` +
        `Team B: ${escapeHtml(teamBStr)}`
    ),
  ]);
}

export async function notifyMatchFinished(input: {
  matchId: string;
  map: string;
  winner: "A" | "B";
  scoreA: number;
  scoreB: number;
  teamA: string[];
  teamB: string[];
  deltaA: number;
  deltaB: number;
}) {
  const idShort = input.matchId.slice(0, 8);
  const winnerTeam = input.winner === "A" ? "Team A" : "Team B";
  const winnerEmoji = input.winner === "A" ? "🟠" : "🌹";
  const teamAStr = input.teamA.join(", ");
  const teamBStr = input.teamB.join(", ");

  await Promise.all([
    sendDiscord({
      embeds: [
        {
          title: `${winnerEmoji} Матч #${idShort} завершён`,
          description: `Победила **${winnerTeam}**\nСчёт **${input.scoreA} : ${input.scoreB}** на **${input.map}**`,
          color: input.winner === "A" ? 0xf97316 : 0xe11d48,
          fields: [
            {
              name: `Team A (${input.deltaA >= 0 ? "+" : ""}${input.deltaA} ELO)`,
              value: teamAStr || "—",
              inline: true,
            },
            {
              name: `Team B (${input.deltaB >= 0 ? "+" : ""}${input.deltaB} ELO)`,
              value: teamBStr || "—",
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    }),
    sendTelegram(
      `${winnerEmoji} <b>Матч #${escapeHtml(idShort)} завершён</b>\n` +
        `Победила <b>${escapeHtml(winnerTeam)}</b>\n` +
        `Счёт: <b>${input.scoreA} : ${input.scoreB}</b> на ${escapeHtml(input.map)}\n` +
        `Team A (${input.deltaA >= 0 ? "+" : ""}${input.deltaA}): ${escapeHtml(teamAStr)}\n` +
        `Team B (${input.deltaB >= 0 ? "+" : ""}${input.deltaB}): ${escapeHtml(teamBStr)}`
    ),
  ]);
}
