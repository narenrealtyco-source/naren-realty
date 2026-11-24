"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import AdminLogoutButton from "../../components/AdminLogoutButton";

type Contact = { id: string; name: string; email: string; role: string; createdAt: string };
type Consent = { id: string; email: string; full_name: string | null; consent_status: string; consent_source: string | null; consented_at: string | null };
type Campaign = { id: string; name: string; subject: string; campaign_type: string; status: string; created_at: string; sent_at: string | null; counts: Record<string,number> };
type Dashboard = { contacts: Contact[]; consents: Consent[]; campaigns: Campaign[]; adminEmail: string; resendConfigured: boolean };

const inputClass = "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100";
const buttonClass = "rounded-lg bg-[#10243A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#193a59] disabled:opacity-50";

export default function CampaignCentrePage() {
  const [data,setData]=useState<Dashboard|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [name,setName]=useState("");
  const [subject,setSubject]=useState("");
  const [bodyHtml,setBodyHtml]=useState("<h2>Namaste {{name}},</h2><p>We have an update for you from NAREN REALTY.</p><p>Thank you for staying connected with us.</p>");
  const [campaignType,setCampaignType]=useState<"greeting"|"promotion"|"update">("greeting");
  const [consentEmail,setConsentEmail]=useState("");
  const [consentSource,setConsentSource]=useState("");
  const [busy,setBusy]=useState(false);
  const [bannerUrl,setBannerUrl]=useState("");
  const [bannerAspect,setBannerAspect]=useState<"16:9"|"9:16">("16:9");
  const [bannerBusy,setBannerBusy]=useState(false);
  const campaignBody=()=>bannerUrl?'<div style="margin:0 0 24px;text-align:center"><img src="'+bannerUrl+'" alt="NAREN REALTY campaign banner" style="display:block;width:100%;max-width:576px;height:auto;margin:0 auto;border:0;border-radius:10px" /></div>'+bodyHtml:bodyHtml;
  async function uploadBanner(file:File){
    setBannerBusy(true);setError("");setNotice("");
    try{const form=new FormData();form.append("file",file);form.append("aspect",bannerAspect);const r=await fetch("/api/admin/campaigns/banner",{method:"POST",body:form});const j=await r.json();if(!r.ok)throw new Error(j.error||"Banner upload failed.");setBannerUrl(j.url);setNotice("Banner uploaded ("+j.width+" × "+j.height+"px).");}
    catch(e){setError(e instanceof Error?e.message:"Banner upload failed.");}
    finally{setBannerBusy(false);}
  }

  const load=useCallback(async()=>{try{const r=await fetch("/api/admin/campaigns",{cache:"no-store"});const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not load campaigns.");setData(j);setError("");}catch(e){setError(e instanceof Error?e.message:"Could not load campaigns.");}finally{setLoading(false);}},[]);
  useEffect(()=>{let active=true;fetch("/api/admin/campaigns",{cache:"no-store"}).then(async r=>{const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not load campaigns.");if(active){setData(j);setError("");}}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Could not load campaigns.");}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);

  async function action(payload:Record<string,unknown>,approved=false){
    setBusy(true);setError("");setNotice("");
    try{const r=await fetch("/api/admin/campaigns",{method:"POST",headers:{"Content-Type":"application/json",...(approved?{"x-campaign-approved":"yes"}:{})},body:JSON.stringify(payload)});const j=await r.json();if(!r.ok)throw new Error(j.error||"Action failed.");setNotice(j.sent!==undefined?`Campaign finished: ${j.sent} sent, ${j.failed} failed out of ${j.audience} opted-in contacts.`:j.sentTo?`Test email sent to ${j.sentTo}.`:"Saved successfully.");await load();return true;}catch(e){setError(e instanceof Error?e.message:"Action failed.");return false;}finally{setBusy(false);}
  }
  async function submitConsent(e:FormEvent){e.preventDefault();if(!confirm("Confirm that this contact has explicitly agreed to receive NAREN REALTY marketing emails?"))return;const ok=await action({action:"consent",email:consentEmail,consentSource});if(ok){setConsentEmail("");setConsentSource("");}}
  async function submitDraft(e:FormEvent){e.preventDefault();await action({action:"save",name,subject,bodyHtml:campaignBody(),campaignType});}
  async function test(){await action({action:"test",name,subject,bodyHtml:campaignBody(),campaignType});}
  async function send(){if(!confirm("FINAL APPROVAL: Send this campaign to every contact with recorded marketing opt-in (maximum 100 recipients)? This action sends real emails and cannot be undone."))return;await action({action:"send",name,subject,bodyHtml:campaignBody(),campaignType},true);}

  const consentMap=new Map((data?.consents??[]).map(c=>[c.email.toLowerCase(),c]));
  const subscribed=(data?.consents??[]).filter(c=>c.consent_status==="subscribed").length;
  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <header className="bg-[#10243A] text-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6"><div><Link href="/admin" className="text-xs font-semibold text-amber-300 hover:underline">← Admin Dashboard</Link><p className="mt-2 text-xs font-bold tracking-[.2em] text-amber-400">NAREN REALTY</p><h1 className="text-2xl font-bold">Email & Campaign Centre</h1><p className="mt-1 text-sm text-slate-300">Wishes, property updates and customer promotions</p></div><AdminLogoutButton className="rounded-lg border border-white/25 px-3 py-2 text-sm"/> </div></header>
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      {error&&<p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {notice&&<p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {data && !data.resendConfigured && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><strong>Resend not connected:</strong> Add a valid RESEND_API_KEY to the Vercel Preview environment and redeploy before test emails or campaigns can be sent.</p>}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">Customer / owner accounts</p><p className="mt-1 text-3xl font-bold text-[#10243A]">{data?.contacts.length??"—"}</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">Marketing opt-ins</p><p className="mt-1 text-3xl font-bold text-emerald-700">{subscribed}</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">Campaigns created</p><p className="mt-1 text-3xl font-bold text-[#10243A]">{data?.campaigns.length??"—"}</p></div>
      </section>
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)]">
        <form onSubmit={submitDraft} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div><p className="text-xs font-bold tracking-widest text-amber-700">CAMPAIGN COMPOSER</p><h2 className="mt-1 text-xl font-bold text-[#10243A]">Create an email</h2><p className="mt-1 text-xs text-slate-500">Sender: noreply@narenrealty.co · Resend</p></div>
          <label className="block text-sm font-semibold">Campaign name<input className={inputClass} value={name} onChange={e=>setName(e.target.value)} required placeholder="e.g. Diwali wishes 2026"/></label>
          <label className="block text-sm font-semibold">Campaign type<select className={inputClass} value={campaignType} onChange={e=>setCampaignType(e.target.value as typeof campaignType)}><option value="greeting">Festival / Birthday Wishes</option><option value="promotion">Property Promotion</option><option value="update">Property / Service Update</option></select></label>
          <label className="block text-sm font-semibold">Email subject<input className={inputClass} value={subject} onChange={e=>setSubject(e.target.value)} required placeholder="A warm festive wish from NAREN REALTY"/></label>
          <div className="rounded-xl border border-slate-200 bg-[#F4F1EF] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold text-[#252525]">Email poster / banner</p><p className="mt-1 text-xs text-slate-600">Optional · JPG, PNG or WebP · Max 5 MB</p></div>
              <div className="flex gap-2"><button type="button" onClick={()=>setBannerAspect("16:9")} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${bannerAspect==="16:9"?"border-[#A71930] bg-[#A71930] text-white":"border-slate-300 bg-white text-slate-700"}`}>16:9 Landscape</button><button type="button" onClick={()=>setBannerAspect("9:16")} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${bannerAspect==="9:16"?"border-[#A71930] bg-[#A71930] text-white":"border-slate-300 bg-white text-slate-700"}`}>9:16 Portrait</button></div>
            </div>
            <label className="mt-3 flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-400 bg-white px-4 py-4 text-sm font-semibold text-[#A71930] hover:bg-rose-50">{bannerBusy?"Uploading banner…":"Choose banner image"}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={bannerBusy} onChange={e=>{const file=e.target.files?.[0];if(file)void uploadBanner(file);e.currentTarget.value="";}} /></label>
            {bannerUrl&&<div className="mt-3"><img src={bannerUrl} alt="Campaign banner preview" className="max-h-72 w-full rounded-lg border border-slate-200 bg-white object-contain" /><div className="mt-2 flex items-center justify-between gap-2"><span className="text-xs font-semibold text-emerald-700">Banner ready for email</span><button type="button" onClick={()=>setBannerUrl("")} className="text-xs font-semibold text-rose-700 underline">Remove banner</button></div></div>}
            <p className="mt-2 text-xs text-slate-500">Image appears above the email message. Select the matching aspect ratio before upload.</p>
          </div>
          <label className="block text-sm font-semibold">Email message (HTML supported)<textarea className={inputClass+" min-h-48 font-mono text-xs"} value={bodyHtml} onChange={e=>setBodyHtml(e.target.value)} required maxLength={30000}/></label>
          <p className="text-xs text-slate-500">Use simple HTML tags. The system adds NAREN REALTY branding and an unsubscribe link automatically.</p>
          <div className="flex flex-wrap gap-2"><button className={buttonClass} type="submit" disabled={busy}>{busy?"Working…":"Save draft"}</button><button className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold" type="button" onClick={test} disabled={busy||!subject||!bodyHtml}>Send test to my admin email</button><button className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50" type="button" onClick={send} disabled={busy||!subject||!bodyHtml||subscribed===0}>Approve & send campaign</button></div>
        </form>
        <div className="space-y-5">
          <form onSubmit={submitConsent} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div><h2 className="font-bold text-[#10243A]">Record marketing consent</h2><p className="mt-1 text-xs leading-5 text-slate-500">Only add a contact after they have explicitly opted in. Existing customer accounts are not automatically subscribed.</p></div><label className="block text-sm font-semibold">Contact email<input type="email" className={inputClass} required value={consentEmail} onChange={e=>setConsentEmail(e.target.value)} placeholder="customer@example.com"/></label><label className="block text-sm font-semibold">Consent source / evidence<input className={inputClass} required minLength={3} value={consentSource} onChange={e=>setConsentSource(e.target.value)} placeholder="Website checkbox, date, form reference…"/></label><button className={buttonClass} disabled={busy} type="submit">Confirm opt-in</button></form>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-[#10243A]">Sending safeguards</h2><ul className="mt-3 space-y-2 text-sm text-slate-600"><li>• Marketing goes only to recorded opt-ins.</li><li>• Unsubscribe is available in every campaign.</li><li>• Test email goes only to your signed-in admin email.</li><li>• Final approval is required before sending.</li><li>• Batch limit: 100 recipients per campaign.</li></ul></div>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-lg font-bold text-[#10243A]">Recent campaigns</h2><button onClick={()=>void load()} className="text-sm font-semibold text-amber-800 underline">Refresh</button></div>{loading?<p className="py-6 text-sm text-slate-500">Loading…</p>:!data?.campaigns.length?<p className="py-6 text-sm text-slate-500">No campaigns yet.</p>:<div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="py-3 pr-3">Campaign</th><th className="py-3 pr-3">Type</th><th className="py-3 pr-3">Status</th><th className="py-3 pr-3">Sent</th><th className="py-3">Created</th></tr></thead><tbody>{data.campaigns.map(c=><tr key={c.id} className="border-b last:border-0"><td className="py-3 pr-3"><strong>{c.name}</strong><p className="text-xs text-slate-500">{c.subject}</p></td><td className="py-3 pr-3 capitalize">{c.campaign_type}</td><td className="py-3 pr-3 capitalize">{c.status}</td><td className="py-3 pr-3 tabular-nums">{c.counts.sent??0}</td><td className="py-3">{new Date(c.created_at).toLocaleDateString("en-IN")}</td></tr>)}</tbody></table></div>}</section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-[#10243A]">Customer email directory</h2><p className="mt-1 text-xs text-slate-500">Account emails are shown for admin review. They are not automatically eligible for marketing.</p>{loading?<p className="py-4 text-sm text-slate-500">Loading…</p>:<div className="mt-3 max-h-80 overflow-auto">{(data?.contacts??[]).map(c=>{const consent=consentMap.get(c.email.toLowerCase());return <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2.5 text-sm last:border-0"><div><p className="font-semibold">{c.name}</p><p className="text-xs text-slate-500">{c.email} · {c.role}</p></div><span className={consent?.consent_status==="subscribed"?"rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700":"rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"}>{consent?.consent_status??"Not opted in"}</span></div>})}</div>}</section>
    </div>
  </main>;
}
