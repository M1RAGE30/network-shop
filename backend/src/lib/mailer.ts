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

export const sendVerificationCodeEmail = async (to: string, code: string) => {
  await transporter.sendMail({
    from: `"NetworkShop" <${process.env.SMTP_USER}>`,
    to,
    subject: "Код подтверждения — NetworkShop",
    html: `
      <div style="margin:0;padding:24px;background:#09090b;font-family:Inter,Arial,sans-serif;color:#fafafa;">
        <div style="max-width:520px;margin:0 auto;border:1px solid rgba(255,255,255,0.12);border-radius:14px;background:#0f0f12;overflow:hidden;">
          <div style="padding:18px 20px;border-bottom:1px solid rgba(255,255,255,0.08);font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#a1a1aa;">
            NetworkShop
          </div>
          <div style="padding:22px 20px;">
            <h2 style="margin:0 0 12px;font-size:22px;line-height:1.25;color:#fafafa;">Подтвердите email</h2>
            <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#d4d4d8;">
              Введите код ниже на сайте. Код действует <strong style="color:#fafafa;">10 минут</strong>.
            </p>
            <div style="display:inline-block;margin:4px 0 14px;padding:10px 14px;border:1px solid rgba(255,255,255,0.16);border-radius:10px;background:#09090b;">
              <span style="font-size:32px;font-weight:700;letter-spacing:6px;color:#fafafa;">${code}</span>
            </div>
            <p style="margin:0;font-size:12px;line-height:1.6;color:#a1a1aa;">
              Если вы не регистрировались в NetworkShop, просто проигнорируйте это письмо.
            </p>
          </div>
        </div>
      </div>
    `,
  });
};
