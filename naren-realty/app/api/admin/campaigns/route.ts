import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../../lib/supabase-server";
import { createSupabaseServiceClient } from "../../../lib/supabase-service";


type CampaignInput = {
  action?: string;
  id?: string;
  name?: string;
  subject?: string;
  bodyHtml?: string;
  campaignType?: "greeting" | "promotion" | "update" | "event";
  email?: string;
  consentSource?: string;
  recipientIds?: string[];
};

const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const jsonError = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

function safeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function renderCampaignEmail(content: string, footer: string) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#F4F1EF;font-family:Arial,Helvetica,sans-serif;color:#252525">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F4F1EF;padding:28px 12px"><tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #eee8e5;border-radius:14px;overflow:hidden">
        <tr><td style="background:#A71930;padding:27px 32px 25px">
          <div style="font-size:23px;line-height:1.2;font-weight:800;letter-spacing:1.2px;color:#ffffff">NAREN REALTY</div>
          <div style="margin-top:7px;font-size:10px;letter-spacing:2.5px;color:#ffffff;opacity:.82">PROPERTY · PEOPLE · POSSIBILITIES</div>
          <div style="margin-top:19px;width:42px;height:3px;background:#ffffff;border-radius:3px"></div>
        </td></tr>
        <tr><td style="padding:34px 32px 38px;font-size:15px;line-height:1.8;color:#252525">${content}</td></tr>
        <tr><td style="padding:21px 32px;background:#F4F1EF;border-top:1px solid #eee8e5;font-size:11px;line-height:1.75;color:#68615f">${footer}<div style="margin-top:13px;color:#A71930;font-weight:800;letter-spacing:1px">NAREN REALTY</div><div style="margin-top:4px;color:#861326">narenrealty.co</div></td></tr>
      </table>
    </td></tr></table>
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
      service.from("email_campaigns").select("id,name,subject,body_html,campaign_type,status,created_at,sent_at").order("created_at", { ascending: false }).limit(50),
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
      const contactName = clean(body.name, 120);
      const source = clean(body.consentSource, 160);
      if (!contactName || !/^\S+@\S+\.\S+$/.test(email) || source.length < 3) return jsonError("Contact full name, valid email and recorded consent source are required.");
      const { error } = await service.from("email_marketing_consents").upsert({
        email, full_name: contactName, consent_status: "subscribed",
        consent_source: source, consented_at: new Date().toISOString(), unsubscribed_at: null, updated_at: new Date().toISOString(),
      }, { onConflict: "email" });
      if (error) return jsonError("Could not save marketing consent.", 500);
      return NextResponse.json({ ok: true });
    }

    const name = clean(body.name, 120);
    const subject = clean(body.subject, 180);
    const bodyHtml = clean(body.bodyHtml, 30000);
    const campaignType = body.campaignType;
    if (!name || !subject || !bodyHtml || !["greeting","promotion","update","event"].includes(campaignType ?? "")) return jsonError("Campaign name, subject, message and type are required.");

    if (body.action === "update") {
      const id = clean(body.id, 80);
      if (!id) return jsonError("Draft ID is required.");
      const { data, error } = await service.from("email_campaigns").update({
        name, subject, body_html: bodyHtml, campaign_type: campaignType, updated_at: new Date().toISOString(),
      }).eq("id", id).eq("created_by", user.id).eq("status", "draft").select("id").maybeSingle();
      if (error || !data) return jsonError("Draft could not be updated. It may no longer be a draft.", 409);
      return NextResponse.json({ ok: true, id: data.id });
    }

    if (body.action === "save") {
      const { data, error } = await service.from("email_campaigns").insert({
        name, subject, body_html: bodyHtml, campaign_type: campaignType, created_by: user.id, status: "draft",
      }).select("id").single();
      if (error || !data) return jsonError("Campaign draft could not be saved.", 500);
      return NextResponse.json({ ok: true, id: data.id });
    }

    if (body.action === "test") {
      if (!user.email) return jsonError("Your admin account does not have an email address.");
      const { data: adminProfile } = await service.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      const testName = adminProfile?.full_name?.trim()
        || user.user_metadata?.full_name?.trim?.()
        || user.user_metadata?.name?.trim?.()
        || user.email.split("@")[0]
        || "there";
      const personalized = bodyHtml.replace(/\\{\\{\\s*name\\s*\\}\\}/gi, safeHtml(testName));
      const html = renderCampaignEmail(personalized, "Preview email sent only to the signed-in admin. This test message is not sent to customers.");
      try { const resendId = await sendResendEmail(user.email, `[TEST] ${subject}`, html); return NextResponse.json({ ok: true, resendId, sentTo: user.email, personalizedName: testName }); }
      catch (error) { return jsonError(error instanceof Error ? error.message : "Test email failed.", 502); }
    }

    if (body.action === "send") {
      const confirmed = request.headers.get("x-campaign-approved") === "yes";
      if (!confirmed) return jsonError("Explicit campaign approval is required.", 403);
      const recipientIds = Array.isArray(body.recipientIds) ? [...new Set(body.recipientIds.filter((id): id is string => typeof id === "string" && id.length <= 80))] : [];
      if (!recipientIds.length || recipientIds.length > 100) return jsonError("Select between 1 and 100 opted-in recipients.", 400);
      const { data: audience, error: audienceError } = await service.from("email_marketing_consents")
        .select("id,email,full_name,unsubscribe_token").eq("consent_status", "subscribed").in("id", recipientIds).limit(100);
      if (audienceError) return jsonError("Selected audience could not be loaded.", 500);
      if (!audience?.length || audience.length !== recipientIds.length) return jsonError("One or more selected contacts are no longer subscribed. Refresh the recipient list and try again.", 409);
      let campaign: { id: string } | null = null;
      if (body.id) {
        const { data, error: draftError } = await service.from("email_campaigns").update({
          name, subject, body_html: bodyHtml, campaign_type: campaignType, status: "sending", updated_at: new Date().toISOString(),
        }).eq("id", clean(body.id, 80)).eq("created_by", user.id).eq("status", "draft").select("id").maybeSingle();
        if (draftError || !data) return jsonError("This draft could not be sent because it is no longer an editable draft.", 409);
        campaign = data;
      } else {
        const { data, error: createError } = await service.from("email_campaigns").insert({
          name, subject, body_html: bodyHtml, campaign_type: campaignType, created_by: user.id, status: "sending",
        }).select("id").single();
        if (createError || !data) return jsonError("Campaign could not be created.", 500);
        campaign = data;
      }
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
      // Use the saved consent name first, then the matching NAREN REALTY account profile.
      const [{ data: authUsers }, { data: profileNames }] = await Promise.all([
        service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
        service.from("profiles").select("id,full_name"),
      ]);
      const profileNameByUserId = new Map((profileNames ?? []).map((profile) => [profile.id, profile.full_name]));
      const accountNameByEmail = new Map((authUsers?.users ?? []).map((account) => [
        (account.email ?? "").toLowerCase(),
        profileNameByUserId.get(account.id) || account.user_metadata?.full_name || account.user_metadata?.name || "",
      ]));
      const messages = recipients.map((recipient) => {
        const displayName = recipient.full_name?.trim() || accountNameByEmail.get(recipient.email.toLowerCase())?.trim() || "there";
        const personalized = bodyHtml.replace(/\{\{\s*name\s*\}\}/gi, safeHtml(displayName));
        const html = renderCampaignEmail(personalized, `You are receiving this because you opted in to NAREN REALTY email updates. <a href="${origin}/api/email/unsubscribe?token=${recipient.unsubscribe_token}" style="color:#10243A">Unsubscribe</a>`);
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
