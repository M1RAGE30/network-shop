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
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#0066cc">Подтвердите email</h2>
        <p>Введите код ниже на сайте NetworkShop. Код действует <strong>10 минут</strong>.</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:24px 0;color:#1d1d1f">${code}</p>
        <p style="color:#6e6e73;font-size:13px">Если вы не регистрировались — проигнорируйте это письмо.</p>
      </div>
    `,
  });
};
