import "server-only";

/**
 * E-mail through Resend (https://resend.com) when RESEND_API_KEY and
 * MAIL_FROM are set. Without them `mailReady()` is false and nothing is sent.
 */
export const mailReady = () => !!(process.env.RESEND_API_KEY && process.env.MAIL_FROM);

export async function sendMail(to: string, subject: string, text: string, html?: string): Promise<boolean> {
  if (!mailReady()) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, text, ...(html ? { html } : {}) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error("sendMail failed", res.status, (await res.text().catch(() => "")).slice(0, 200));
    return res.ok;
  } catch (err) {
    console.error("sendMail failed", err);
    return false;
  }
}
