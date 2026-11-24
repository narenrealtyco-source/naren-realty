import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../../lib/supabase-server";
import { createSupabaseServiceClient } from "../../../lib/supabase-service";


type CampaignInput = {
  action?: string;
  id?: string;
  name?: string;
  subject?: string;
  bodyHtml?: string;
  campaignType?: "greeting" | "promotion" | "update";
  email?: string;
  consentSource?: string;
};

const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const jsonError = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

function safeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function buildBrandedEmail(content: string, footer: string) {
  const safeFooter = footer;
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>NAREN REALTY</title></head>
<body style="margin:0;padding:0;background-color:#F4F1EF;font-family:Arial,Helvetica,sans-serif;color:#252525;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F4F1EF;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background-color:#ffffff;border:1px solid #e9e3df;border-radius:16px;overflow:hidden;">
        <tr><td style="height:6px;background-color:#C9A96E;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td align="center" style="background-color:#A71930;padding:28px 24px 25px;">
          <p style="margin:0;color:#ffffff;font-size:23px;line-height:1.2;font-weight:800;letter-spacing:2px;">NAREN <span style="font-weight:400;color:#f3dfe3;">REALTY</span></p>
          <p style="margin:10px 0 0;color:#f5dfe3;font-size:10px;line-height:1.5;font-weight:700;letter-spacing:3px;text-transform:uppercase;">A better way to find your place</p>
        </td></tr>
        <tr><td style="padding:34px 32px 30px;font-size:15px;line-height:1.8;color:#343434;">${content}</td></tr>
        <tr><td style="padding:0 32px;"><div style="height:1px;background-color:#eee8e4;font-size:0;line-height:0;">&nbsp;</div></td></tr>
        <tr><td align="center" style="padding:22px 24px 26px;background-color:#fbf9f7;">
          <p style="margin:0;color:#A71930;font-size:12px;font-weight:700;letter-spacing:1.5px;">NAREN REALTY</p>
          <p style="margin:7px 0 0;color:#77716d;font-size:12px;line-height:1.6;">Pune, Maharashtra, India</p>
          <p style="margin:10px 0 0;font-size:12px;line-height:1.6;"><a href="https://narenrealty.co" style="color:#A71930;font-weight:700;text-decoration:none;">narenrealty.co</a></p>
          <p style="margin:14px 0 0;color:#89817c;font-size:11px;line-height:1.6;">${safeFooter}</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;color:#9a928d;font-size:10px;line-height:1.5;">© 2026 NAREN REALTY. All rights reserved.</p>
    </td></tr>
  </table>
</body></html>`;
}

async function sendResendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Resend is not configured for this deployment. Add RESEND_API_KEY to the Preview environment.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "NAREN REALTY <noreply@narenrealty.co>", to: [to], subject, html }),
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({})) as { id?: string; message?: string };
  if (!response.ok || !result.id) throw new Error(result.message || `Resend request failed (${response.status}).`);
  return result.id;
}

export async function GET() {
  try {
    const { user } = await requireAdmin();
    const service = createSupabaseServiceClient();
    const [{ data: profiles, error: profilesError }, { data: auth, error: authError }, { data: consents, error: consentError }, { data: campaigns, error: campaignsError }] = await Promise.all([
      service.from("profiles").select("id,full_name,phone,role,created_at").in("role", ["customer","owner"]).order("created_at", { ascending: false }).limit(500),
      service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      service.from("email_marketing_consents").select("id,email,full_name,consent_status,consent_source,consented_at,unsubscribe_token").order("updated_at", { ascending: false }).limit(1000),
      service.from("email_campaigns").select("id,name,subject,campaign_type,status,created_at,sent_at").order("created_at", { ascending: false }).limit(50),
    ]);
    if (profilesError || authError || consentError || campaignsError) return jsonError("Campaign data could not be loaded. Apply the campaign database migration first.", 503);
    const users = new Map((auth.users ?? []).map((item) => [item.id, item]));
    const contacts = (profiles ?? []).flatMap((profile) => {
      const account = users.get(profile.id);
      return account?.email ? [{ id: profile.id, name: profile.full_name || account.user_metadata?.full_name || "Customer", email: account.email, role: profile.role, createdAt: profile.created_at }] : [];
    });
    const sent = await service.from("email_campaign_recipients").select("campaign_id,status");
    const counts = new Map<string, Record<string, number>>();
    for (const row of sent.data ?? []) {
      const value = counts.get(row.campaign_id) ?? {};
      value[row.status] = (value[row.status] ?? 0) + 1;
      counts.set(row.campaign_id, value);
    }
    return NextResponse.json({ contacts, consents: consents ?? [], campaigns: (campaigns ?? []).map((campaign) => ({ ...campaign, counts: counts.get(campaign.id) ?? {} })), adminEmail: user.email ?? "", resendConfigured: Boolean(process.env.RESEND_API_KEY) });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Admin authorization required.", 401);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAdmin();
    const body = await request.json() as CampaignInput;
    const service = createSupabaseServiceClient();

    if (body.action === "consent") {
      const email = clean(body.email, 254).toLowerCase();
      const source = clean(body.consentSource, 160);
      if (!/^\S+@\S+\.\S+$/.test(email) || source.length < 3) return jsonError("Valid email and recorded consent source are required.");
      const { error } = await service.from("email_marketing_consents").upsert({
        email, full_name: clean(body.name, 120) || null, consent_status: "subscribed",
        consent_source: source, consented_at: new Date().toISOString(), unsubscribed_at: null, updated_at: new Date().toISOString(),
      }, { onConflict: "email" });
      if (error) return jsonError("Could not save marketing consent.", 500);
      return NextResponse.json({ ok: true });
    }

    const name = clean(body.name, 120);
    const subject = clean(body.subject, 180);
    const bodyHtml = clean(body.bodyHtml, 30000);
    const campaignType = body.campaignType;
    if (!name || !subject || !bodyHtml || !["greeting","promotion","update"].includes(campaignType ?? "")) return jsonError("Campaign name, subject, message and type are required.");

    if (body.action === "save") {
      const { data, error } = await service.from("email_campaigns").insert({
        name, subject, body_html: bodyHtml, campaign_type: campaignType, created_by: user.id, status: "draft",
      }).select("id").single();
      if (error || !data) return jsonError("Campaign draft could not be saved.", 500);
      return NextResponse.json({ ok: true, id: data.id });
    }

    if (body.action === "test") {
      if (!user.email) return jsonError("Your admin account does not have an email address.");
      const html = buildBrandedEmail(bodyHtml, "This is a private preview sent only to the signed-in NAREN REALTY admin.");
      try { const resendId = await sendResendEmail(user.email, `[TEST] ${subject}`, html); return NextResponse.json({ ok: true, resendId, sentTo: user.email }); }
      catch (error) { return jsonError(error instanceof Error ? error.message : "Test email failed.", 502); }
    }

    if (body.action === "send") {
      const confirmed = request.headers.get("x-campaign-approved") === "yes";
      if (!confirmed) return jsonError("Explicit campaign approval is required.", 403);
      const { data: audience, error: audienceError } = await service.from("email_marketing_consents")
        .select("id,email,full_name,unsubscribe_token").eq("consent_status", "subscribed").limit(100);
      if (audienceError) return jsonError("Subscribed audience could not be loaded.", 500);
      if (!audience?.length) return jsonError("No contacts have recorded marketing consent. Add only contacts with documented opt-in first.", 409);
      const { data: campaign, error: createError } = await service.from("email_campaigns").insert({
        name, subject, body_html: bodyHtml, campaign_type: campaignType, created_by: user.id, status: "sending",
      }).select("id").single();
      if (createError || !campaign) return jsonError("Campaign could not be created.", 500);
      const origin = new URL(request.url).origin;
      const recipients = audience.filter((recipient) => /^\S+@\S+\.\S+$/.test(recipient.email));
      if (recipients.length !== audience.length) {
        await service.from("email_campaigns").update({ status: "failed" }).eq("id", campaign.id);
        return jsonError("Some subscribed contacts have invalid email addresses. Correct the contact records before sending.", 409);
      }
      const recipientRows = recipients.map((recipient) => ({
        campaign_id: campaign.id, consent_id: recipient.id, email: recipient.email, status: "pending",
      }));
      const { data: insertedRecipients, error: insertError } = await service
        .from("email_campaign_recipients").insert(recipientRows).select("id,email");
      if (insertError || !insertedRecipients || insertedRecipients.length !== recipients.length) {
        await service.from("email_campaigns").update({ status: "failed" }).eq("id", campaign.id);
        return jsonError("Campaign recipients could not be prepared safely.", 500);
      }
      const byEmail = new Map(insertedRecipients.map((row) => [row.email.toLowerCase(), row]));
      const messages = recipients.map((recipient) => {
        const personalized = bodyHtml.replace(/\{\{\s*name\s*\}\}/gi, safeHtml(recipient.full_name || "there"));
        const html = buildBrandedEmail(personalized, `You are receiving this because you opted in to NAREN REALTY email updates. <a href="${origin}/api/email/unsubscribe?token=${recipient.unsubscribe_token}" style="color:#A71930;font-weight:700;">Unsubscribe</a>`);
        return { from: "NAREN REALTY <noreply@narenrealty.co>", to: [recipient.email], subject, html };
      });
      let sentCount = 0;
      let failedCount = 0;
      const key = process.env.RESEND_API_KEY;
      if (!key) {
        await service.from("email_campaign_recipients").update({ status: "failed", error_message: "Resend API key is not configured." }).eq("campaign_id", campaign.id);
        await service.from("email_campaigns").update({ status: "failed" }).eq("id", campaign.id);
        return jsonError("Resend API key is missing in this Vercel environment. Configure RESEND_API_KEY and redeploy.", 503);
      }
      try {
        const response = await fetch("https://api.resend.com/emails/batch", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `naren-campaign-${campaign.id}` },
          body: JSON.stringify(messages),
          cache: "no-store",
        });
        const result = await response.json().catch(() => ({})) as { data?: Array<{ id: string }>; message?: string };
        if (!response.ok || !Array.isArray(result.data) || result.data.length !== recipients.length) {
          throw new Error(result.message || `Resend batch request failed (${response.status}).`);
        }
        for (let index = 0; index < recipients.length; index++) {
          const record = byEmail.get(recipients[index].email.toLowerCase());
          if (!record) continue;
          await service.from("email_campaign_recipients").update({
            status: "sent", resend_id: result.data[index].id, sent_at: new Date().toISOString(),
          }).eq("id", record.id);
          sentCount++;
        }
      } catch (error) {
        failedCount = recipients.length;
        await service.from("email_campaign_recipients").update({
          status: "failed", error_message: error instanceof Error ? error.message.slice(0,500) : "Batch send failed",
        }).eq("campaign_id", campaign.id);
      }
      const status = sentCount === recipients.length ? "sent" : sentCount > 0 ? "partial" : "failed";
      await service.from("email_campaigns").update({ status, sent_at: sentCount ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", campaign.id);
      return NextResponse.json({ ok: true, campaignId: campaign.id, sent: sentCount, failed: failedCount, audience: audience.length });
    }
    return jsonError("Unknown campaign action.");
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Admin authorization required.", 401);
  }
}
