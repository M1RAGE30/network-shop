import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const EMAIL_STYLES = `
  body { margin: 0; padding: 0; overflow-x: hidden; }
  .wrapper { width: 100%; max-width: 100%; padding: 24px 16px; box-sizing: border-box; overflow-x: hidden; }
  .card { width: 100%; max-width: 480px; margin: 0 auto; border-radius: 14px; overflow: hidden; box-sizing: border-box; }
  .head { padding: 16px 20px; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; }
  .body { padding: 24px 20px 22px; text-align: center; box-sizing: border-box; }
  h1 { margin: 0 0 12px; font-size: 22px; line-height: 1.3; }
  .lead { margin: 0 0 20px; font-size: 14px; line-height: 1.6; }
  .code-box { margin: 0 auto 18px; padding: 14px 16px; border-radius: 10px; display: inline-block; max-width: 100%; box-sizing: border-box; text-align: center; }
  .code { font-size: 28px; font-weight: 700; letter-spacing: 0.35em; line-height: 1.2; font-family: ui-monospace, Consolas, monospace; white-space: nowrap; }
  .btn-wrap { margin: 0 0 18px; }
  .btn { display: inline-block; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none; }
  .foot { margin: 0; font-size: 12px; line-height: 1.6; max-width: 100%; }
  @media (prefers-color-scheme: light) {
    .wrapper { background: #f4f4f5 !important; }
    .card { background: #ffffff !important; border: 1px solid rgba(9,9,11,0.1) !important; }
    .head { color: #71717a !important; border-bottom: 1px solid rgba(9,9,11,0.08) !important; }
    .body, h1 { color: #09090b !important; }
    .lead, .foot { color: #52525b !important; }
    .code-box { background: #f4f4f5 !important; border: 1px solid rgba(9,9,11,0.12) !important; }
    .code { color: #09090b !important; }
    .btn { background: #09090b !important; color: #ffffff !important; }
  }
  @media (prefers-color-scheme: dark) {
    .wrapper { background: #09090b !important; }
    .card { background: #0f0f12 !important; border: 1px solid rgba(255,255,255,0.12) !important; }
    .head { color: #a1a1aa !important; border-bottom: 1px solid rgba(255,255,255,0.08) !important; }
    .body, h1 { color: #fafafa !important; }
    .lead, .foot { color: #a1a1aa !important; }
    .code-box { background: #09090b !important; border: 1px solid rgba(255,255,255,0.16) !important; }
    .code { color: #fafafa !important; }
    .btn { background: #fafafa !important; color: #09090b !important; }
  }
`;

function networkShopEmailHtml(bodyInner: string) {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>NetworkShop</title>
  <style>${EMAIL_STYLES}</style>
</head>
<body>
  <div class="wrapper" style="background:#f4f4f5;">
    <div class="card" style="background:#ffffff;border:1px solid rgba(9,9,11,0.1);">
      <div class="head" style="color:#71717a;border-bottom:1px solid rgba(9,9,11,0.08);font-family:Inter,Arial,sans-serif;">
        NetworkShop
      </div>
      <div class="body" style="font-family:Inter,Arial,sans-serif;text-align:center;">
        ${bodyInner}
      </div>
    </div>
  </div>
</body>
</html>`;
}

function shopOrigin(): string {
  const raw =
    process.env.SHOP_URL?.trim() ||
    process.env.CORS_ORIGINS?.split(",")[0]?.trim() ||
    "http://localhost:5173";
  return raw.replace(/\/$/, "");
}

function verificationEmailHtml(code: string) {
  return networkShopEmailHtml(`
        <h1 style="color:#09090b;">Подтвердите email</h1>
        <p class="lead" style="color:#52525b;">
          Введите код на сайте. Код действует <strong>10 минут</strong>.
        </p>
        <div class="code-box" style="background:#f4f4f5;border:1px solid rgba(9,9,11,0.12);max-width:100%;box-sizing:border-box;">
          <span class="code" style="color:#09090b;font-size:28px;letter-spacing:0.35em;">${code}</span>
        </div>
        <p class="foot" style="color:#52525b;">
          Если вы не регистрировались в NetworkShop, проигнорируйте это письмо.
        </p>`);
}

function passwordResetEmailHtml(resetUrl: string) {
  return networkShopEmailHtml(`
        <h1 style="color:#09090b;">Сброс пароля</h1>
        <p class="lead" style="color:#52525b;">
          Перейдите по ссылке, чтобы задать новый пароль. Ссылка действует <strong>1 час</strong>.
        </p>
        <div class="btn-wrap">
          <a class="btn" href="${resetUrl}" style="background:#09090b;color:#ffffff;">Сбросить пароль</a>
        </div>
        <p class="foot" style="color:#52525b;">
          Если вы не запрашивали сброс, проигнорируйте письмо. Ссылка перестанет работать через час.
        </p>`);
}

export const sendVerificationCodeEmail = async (to: string, code: string) => {
  await transporter.sendMail({
    from: `"NetworkShop" <${process.env.SMTP_USER}>`,
    to,
    subject: "Код подтверждения – NetworkShop",
    text: `Код подтверждения NetworkShop: ${code}\n\nКод действует 10 минут.`,
    html: verificationEmailHtml(code),
  });
};

export const sendPasswordResetEmail = async (to: string, token: string) => {
  const resetUrl = `${shopOrigin()}/reset-password?token=${encodeURIComponent(token)}`;
  await transporter.sendMail({
    from: `"NetworkShop" <${process.env.SMTP_USER}>`,
    to,
    subject: "Сброс пароля – NetworkShop",
    text: `Сброс пароля NetworkShop:\n${resetUrl}\n\nСсылка действует 1 час.`,
    html: passwordResetEmailHtml(resetUrl),
  });
};
