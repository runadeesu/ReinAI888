import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  return transporter;
}

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends transactional email over SMTP when credentials are configured.
 * If SMTP isn't configured yet (fresh install), the link is logged to the
 * server console so local development / first-run setup still works.
 */
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<void> {
  const client = getTransporter();
  if (!client) {
    console.warn(
      `[ReinAI email] SMTP not configured — printing email instead of sending.\nTo: ${to}\nSubject: ${subject}\n${html}`
    );
    return;
  }
  await client.sendMail({
    from: process.env.SMTP_FROM ?? "ReinAI <noreply@reinai.local>",
    to,
    subject,
    html,
  });
}

export function verificationEmailHtml(verifyUrl: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2>ReinAIへようこそ</h2>
      <p>以下のボタンをクリックしてメールアドレスを確認してください。</p>
      <p><a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px">メールアドレスを確認する</a></p>
      <p>このリンクは24時間有効です。心当たりがない場合はこのメールを無視してください。</p>
    </div>`;
}

export function passwordResetEmailHtml(resetUrl: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2>パスワードの再設定</h2>
      <p>以下のボタンからパスワードを再設定できます。</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px">パスワードを再設定する</a></p>
      <p>このリンクは1時間有効です。心当たりがない場合はこのメールを無視してください。</p>
    </div>`;
}

export function emailChangeEmailHtml(confirmUrl: string, newEmail: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2>メールアドレス変更の確認</h2>
      <p>アカウントのメールアドレスを <strong>${newEmail}</strong> に変更するリクエストを受け付けました。</p>
      <p><a href="${confirmUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px">変更を確認する</a></p>
      <p>このリンクは1時間有効です。心当たりがない場合はこのメールを無視してください。</p>
    </div>`;
}
