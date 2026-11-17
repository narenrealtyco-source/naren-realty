import "server-only";

type SetupEmailInput = { to: string; name: string; actionLink: string };

export async function sendManagerSetupEmail({ to, name, actionLink }: SetupEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Email service is not configured. Add RESEND_API_KEY in Vercel.");
  const safeName = name.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "NAREN REALTY <noreply@narenrealty.co>",
      to: [to],
      subject: "Set up your NAREN REALTY Manager account",
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172b3d"><h2>NAREN REALTY</h2><p>Hello ${safeName},</p><p>Your Manager account is ready. Use the secure button below to create your password and activate access.</p><p><a href="${actionLink}" style="display:inline-block;background:#10243A;color:#fff;padding:13px 22px;border-radius:8px;text-decoration:none">Set up your account</a></p><p>If you did not expect this email, you can ignore it.</p><p style="font-size:12px;color:#64748b">NAREN REALTY</p></div>`,
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    console.error("[email] Resend rejected manager setup email", response.status, body.slice(0, 500));
    throw new Error("Email provider could not accept the setup email. Check Resend domain and API key.");
  }
}
