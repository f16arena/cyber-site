import { Resend } from "resend";
import { prisma } from "./prisma";
import { rateLimit } from "./rate-limit";

let resendClient: Resend | null = null;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!resendClient) resendClient = new Resend(key);
  return resendClient;
}

const FROM_ADDRESS =
  process.env.RESEND_FROM || "Esports.kz <noreply@esports.kz>";

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  type: string;
};

export async function sendEmail(args: SendArgs): Promise<boolean> {
  const client = getClient();
  if (!client) {
    console.warn(`[email] RESEND_API_KEY not set; skipping "${args.subject}"`);
    return false;
  }

  // Rate limit per recipient: 5 писем в час одного типа.
  // Защита: если кто-то спамит submit на /sponsors, мы не зашлём
  // 100 писем админу — резендa-квоту бережём.
  const rlKey = `email:${args.type}:${args.to}`;
  if (!rateLimit(rlKey, 5, 60 * 60_000).allowed) {
    console.warn(`[email] rate-limited: ${rlKey}`);
    return false;
  }

  try {
    const result = await client.emails.send({
      from: FROM_ADDRESS,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    });

    await prisma.emailLog
      .create({
        data: {
          to: args.to,
          subject: args.subject,
          type: args.type,
          status: result.data?.id ? "SENT" : "FAILED",
          error: result.error ? JSON.stringify(result.error) : null,
        },
      })
      .catch(() => {});

    return !!result.data?.id;
  } catch (e) {
    const errorMsg = (e as Error).message;
    console.error("[email] send failed:", errorMsg);
    await prisma.emailLog
      .create({
        data: {
          to: args.to,
          subject: args.subject,
          type: args.type,
          status: "FAILED",
          error: errorMsg,
        },
      })
      .catch(() => {});
    return false;
  }
}

/** Базовый шаблон с фирменным брендингом (F16 ARENA, HLTV-палитра). */
function wrapTemplate(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background: #1c1c1c; color: #d9d9d9; margin: 0; padding: 24px; }
  .container { max-width: 600px; margin: 0 auto; background: #232323; overflow: hidden; border: 1px solid #2e2e2e; }
  .header { padding: 16px 24px; background: #ffd42a; }
  .logo { color: #161616; font-weight: 800; font-size: 16px; letter-spacing: -0.3px; }
  .logo .arena { color: #161616; }
  .content { padding: 24px; line-height: 1.5; }
  h1 { font-size: 18px; margin: 0 0 12px; color: #d9d9d9; }
  p { color: #d9d9d9; margin: 0 0 10px; font-size: 14px; }
  a.btn { display: inline-block; margin-top: 14px; padding: 9px 18px; background: #ffd42a; color: #161616 !important; text-decoration: none; font-weight: bold; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px; }
  .footer { padding: 14px 24px; font-size: 11px; color: #6e6e6e; text-align: center; border-top: 1px solid #2e2e2e; }
</style>
</head>
<body>
  <div class="container">
    <div class="header"><div class="logo">F16 <span class="arena">ARENA</span></div></div>
    <div class="content">${content}</div>
    <div class="footer">© 2026 F16 Arena · Уведомления отключаются в /profile/edit</div>
  </div>
</body>
</html>`;
}

const SITE_URL =
  process.env.SITE_URL || "https://cyber-site-five.vercel.app";

export async function emailFriendRequest(
  toEmail: string,
  fromUsername: string
) {
  return sendEmail({
    to: toEmail,
    subject: `${fromUsername} хочет добавить тебя в друзья`,
    type: "FRIEND_REQUEST",
    html: wrapTemplate(`
      <h1>👥 Новый запрос в друзья</h1>
      <p><strong>${fromUsername}</strong> хочет добавить тебя в друзья на Esports.kz.</p>
      <a class="btn" href="${SITE_URL}/friends">Открыть друзей</a>
    `),
    text: `${fromUsername} хочет добавить тебя в друзья. Перейди на ${SITE_URL}/friends`,
  });
}

export async function emailTeamJoinRequest(
  toEmail: string,
  fromUsername: string,
  teamName: string,
  teamTag: string
) {
  return sendEmail({
    to: toEmail,
    subject: `${fromUsername} хочет вступить в ${teamName}`,
    type: "TEAM_JOIN_REQUEST",
    html: wrapTemplate(`
      <h1>🛡 Заявка в команду</h1>
      <p><strong>${fromUsername}</strong> хочет вступить в твою команду <strong>${teamName}</strong>.</p>
      <a class="btn" href="${SITE_URL}/teams/${teamTag}/edit">Рассмотреть заявку</a>
    `),
    text: `${fromUsername} подал заявку в ${teamName}. ${SITE_URL}/teams/${teamTag}/edit`,
  });
}

export async function emailMvpAwarded(
  toEmail: string,
  username: string,
  matchUrl: string,
  tournamentName?: string
) {
  return sendEmail({
    to: toEmail,
    subject: `⭐ ${username}, ты получил MVP матча!`,
    type: "MVP_AWARDED",
    html: wrapTemplate(`
      <h1>⭐ MVP матча — это ты!</h1>
      <p>Поздравляем, <strong>${username}</strong>! Тебя выбрали MVP в матче${tournamentName ? ` на турнире <strong>${tournamentName}</strong>` : ""}.</p>
      <a class="btn" href="${matchUrl}">Открыть матч</a>
    `),
    text: `Ты MVP матча${tournamentName ? ` (${tournamentName})` : ""}. ${matchUrl}`,
  });
}

export async function emailNewMessage(
  toEmail: string,
  fromUsername: string,
  preview: string
) {
  return sendEmail({
    to: toEmail,
    subject: `💬 Новое сообщение от ${fromUsername}`,
    type: "NEW_MESSAGE",
    html: wrapTemplate(`
      <h1>💬 Новое сообщение</h1>
      <p><strong>${fromUsername}</strong> написал тебе:</p>
      <p style="background: #27272a; padding: 12px; border-radius: 8px; font-style: italic;">${preview}</p>
      <a class="btn" href="${SITE_URL}/messages">Открыть переписку</a>
    `),
    text: `${fromUsername}: ${preview}\n\nОткрыть: ${SITE_URL}/messages`,
  });
}

export async function emailSponsorInquiryReceived(
  toEmail: string,
  contactName: string,
  companyName: string
) {
  return sendEmail({
    to: toEmail,
    subject: "Спасибо за интерес к Esports.kz",
    type: "SPONSOR_INQUIRY_THANK_YOU",
    html: wrapTemplate(`
      <h1>👋 Получили твою заявку</h1>
      <p>Привет, <strong>${contactName}</strong>!</p>
      <p>Спасибо за интерес от <strong>${companyName}</strong>. Мы получили заявку и
      свяжемся в течение <strong>24 часов</strong> с персональным предложением — без шаблонов.</p>
      <p>Если срочно — пиши на <a href="mailto:hello@esports.kz" style="color:#a78bfa">hello@esports.kz</a>.</p>
      <a class="btn" href="${SITE_URL}/sponsors">Снова на сайт</a>
    `),
    text: `Спасибо, ${contactName}! Заявка от ${companyName} получена. Свяжемся в течение 24ч.`,
  });
}

export async function emailSponsorInquiry(
  toEmail: string,
  inquiry: {
    companyName: string;
    contactName: string;
    email: string;
    phone?: string | null;
    tier?: string | null;
    message?: string | null;
  }
) {
  const tierLine = inquiry.tier ? `<strong>Тир:</strong> ${inquiry.tier}<br>` : "";
  const phoneLine = inquiry.phone ? `<strong>Телефон:</strong> ${inquiry.phone}<br>` : "";
  const msgBlock = inquiry.message
    ? `<p style="background: #27272a; padding: 12px; border-radius: 8px; font-style: italic;">${inquiry.message.replace(/\n/g, "<br>")}</p>`
    : "";
  return sendEmail({
    to: toEmail,
    subject: `💰 Новая заявка от спонсора: ${inquiry.companyName}`,
    type: "SPONSOR_INQUIRY",
    html: wrapTemplate(`
      <h1>💰 Новая заявка от спонсора</h1>
      <p><strong>Компания:</strong> ${inquiry.companyName}<br>
      <strong>Контакт:</strong> ${inquiry.contactName} &lt;${inquiry.email}&gt;<br>
      ${phoneLine}${tierLine}</p>
      ${msgBlock}
      <a class="btn" href="${SITE_URL}/admin/inquiries">Открыть в админке</a>
    `),
    text: `Новая заявка от ${inquiry.companyName} (${inquiry.contactName}, ${inquiry.email}). ${SITE_URL}/admin/inquiries`,
  });
}

export async function emailVerifyAddress(
  toEmail: string,
  username: string,
  verifyUrl: string
) {
  return sendEmail({
    to: toEmail,
    subject: `Подтверди email на F16 Arena`,
    type: "VERIFY_EMAIL",
    html: wrapTemplate(`
      <h1>Подтверждение email</h1>
      <p>Привет, <strong>${username}</strong>!</p>
      <p>Подтверди свой email чтобы получать уведомления о турнирах,
      приглашениях в команду и результатах матчей.</p>
      <a class="btn" href="${verifyUrl}">Подтвердить email</a>
      <p style="margin-top:16px; font-size:12px; color:#6e6e6e;">
        Ссылка действительна 24 часа. Если ты не запрашивал подтверждение —
        просто проигнорируй письмо.
      </p>
    `),
    text: `Подтверди email на F16 Arena: ${verifyUrl}`,
  });
}

export async function emailMatchResultDispute(
  toEmail: string,
  matchUrl: string,
  scoreA: number,
  scoreB: number
) {
  return sendEmail({
    to: toEmail,
    subject: `⚠ Заявка о результате матча`,
    type: "MATCH_RESULT_CLAIM",
    html: wrapTemplate(`
      <h1>⚠ Подтверждение результата</h1>
      <p>Соперник заявил счёт <strong>${scoreA}:${scoreB}</strong> в вашем матче.</p>
      <p>Если согласен — подтверди тот же счёт. Если нет — отметь как спорный, и админ разберёт.</p>
      <a class="btn" href="${matchUrl}">Открыть матч</a>
    `),
    text: `Соперник заявил счёт ${scoreA}:${scoreB}. Подтверди или оспорь: ${matchUrl}`,
  });
}
