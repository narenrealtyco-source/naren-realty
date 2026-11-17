"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../lib/supabase-server";
import { createSupabaseServiceClient } from "../../lib/supabase-service";

export type ManagerActionState = { status: "idle" | "error" | "success"; message: string };

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://narenrealty.co").replace(/\/$/, "");
}
function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
async function sendManagerSetupEmail(email: string, fullName: string, tokenHash: string, type: "invite" | "recovery") {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Email service is not configured. Ask the administrator to configure RESEND_API_KEY.");
  const link = new URL("/auth/confirm", siteUrl());
  link.searchParams.set("token_hash", tokenHash);
  link.searchParams.set("type", type);
  const greeting = escapeHtml(fullName || "Manager");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "NAREN REALTY <noreply@narenrealty.co>",
      to: [email],
      subject: "Secure your NAREN REALTY Manager Account",
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#10243A"><h2>NAREN REALTY</h2><p>Hello ${greeting},</p><p>Use the secure button below to ${type === "invite" ? "activate your manager account" : "set a new password for your manager account"}.</p><p><a href="${link.toString()}" style="display:inline-block;background:#10243A;color:white;padding:13px 22px;border-radius:6px;text-decoration:none">Secure account setup</a></p><p>This link is single-use and expires. If you did not expect this email, ignore it.</p><p style="font-size:12px;color:#64748b">NAREN REALTY</p></div>`,
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error("[manager-email] Resend rejected message", response.status, detail.slice(0, 500));
    throw new Error("Setup email could not be sent. Check the email service configuration.");
  }
}

export async function createManager(_state: ManagerActionState, form: FormData): Promise<ManagerActionState> {
  try { await requireAdmin(); } catch { return { status: "error", message: "Admin authorization is required." }; }
  const fullName = String(form.get("full_name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const phone = String(form.get("phone") ?? "").replace(/[\\s()-]/g, "");
  const area = String(form.get("area") ?? "").trim();
  if (fullName.length < 2 || fullName.length > 100 || !/^\\S+@\\S+\\.\\S+$/.test(email) || !/^\\+91[6-9]\\d{9}$/.test(phone) || area.length > 100) {
    return { status: "error", message: "Enter a valid name, email, Indian mobile number and area." };
  }
  const service = createSupabaseServiceClient();
  const { data: existing } = await service.from("profiles").select("id").eq("manager_email", email).eq("role", "manager").maybeSingle();
  if (existing) return { status: "error", message: "A manager with this email already exists. Use Resend Setup Email in the manager list." };
  const { data: generated, error } = await service.auth.admin.generateLink({
    type: "invite", email, options: { data: { full_name: fullName, phone } },
  });
  const user = generated?.user;
  const tokenHash = generated?.properties?.hashed_token;
  if (error || !user || !tokenHash) return { status: "error", message: error?.message ?? "Secure manager invitation could not be generated." };
  const { data: profile, error: profileError } = await service.from("profiles").upsert({
    id: user.id, full_name: fullName, phone, role: "manager", manager_active: true,
    manager_area: area || null, manager_email: email,
  }, { onConflict: "id" }).select("id,role").single();
  if (profileError || !profile || profile.id !== user.id || profile.role !== "manager") {
    await service.auth.admin.deleteUser(user.id);
    console.error("[manager] Profile upsert failed", { code: profileError?.code ?? "profile_verification_failed" });
    return { status: "error", message: "Manager profile could not be verified. Account creation was rolled back." };
  }
  try {
    await sendManagerSetupEmail(email, fullName, tokenHash, "invite");
  } catch (e) {
    await service.from("profiles").delete().eq("id", user.id).eq("role", "manager");
    await service.auth.admin.deleteUser(user.id);
    return { status: "error", message: e instanceof Error ? e.message : "Setup email failed; manager creation was rolled back." };
  }
  revalidatePath("/admin"); revalidatePath("/admin/managers"); revalidatePath("/admin/visits");
  return { status: "success", message: "Manager created. Secure account setup email sent successfully." };
}

export async function resendManagerSetupEmail(_state: ManagerActionState, form: FormData): Promise<ManagerActionState> {
  try { await requireAdmin(); } catch { return { status: "error", message: "Admin authorization is required." }; }
  const id = String(form.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { status: "error", message: "Invalid manager account." };
  const service = createSupabaseServiceClient();
  const { data: manager, error: profileError } = await service.from("profiles")
    .select("manager_email,full_name").eq("id", id).eq("role", "manager").maybeSingle();
  if (profileError || !manager?.manager_email) return { status: "error", message: "Manager email could not be found." };
  const { data, error } = await service.auth.admin.generateLink({ type: "recovery", email: manager.manager_email });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) return { status: "error", message: error?.message ?? "Secure setup link could not be generated." };
  try {
    await sendManagerSetupEmail(manager.manager_email, manager.full_name || "Manager", tokenHash, "recovery");
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Setup email could not be sent." };
  }
  return { status: "success", message: "A fresh secure setup email has been sent." };
}

export async function setManagerActive(_state:ManagerActionState,form:FormData):Promise<ManagerActionState>{
 try{await requireAdmin();}catch{return{status:"error",message:"Admin authorization is required."};}
 const id=String(form.get("id")??""),active=String(form.get("active")??"");
 if(!/^[0-9a-f-]{36}$/i.test(id)||!["true","false"].includes(active))return{status:"error",message:"Invalid manager update."};
 const service=createSupabaseServiceClient();const{data,error}=await service.from("profiles").update({manager_active:active==="true"}).eq("id",id).eq("role","manager").select("id").maybeSingle();
 if(error||!data)return{status:"error",message:"Manager status could not be updated."};revalidatePath("/admin/managers");return{status:"success",message:active==="true"?"Manager activated.":"Manager deactivated."};
}
export async function assignVisitToManager(_state:ManagerActionState,form:FormData):Promise<ManagerActionState>{
 try{await requireAdmin();}catch{return{status:"error",message:"Admin authorization is required."};}
 const visitId=String(form.get("visit_id")??""),managerId=String(form.get("manager_id")??"");
 if(!/^[0-9a-f-]{36}$/i.test(visitId)||!(/^[0-9a-f-]{36}$/i.test(managerId)))return{status:"error",message:"Select a valid manager."};
 const service=createSupabaseServiceClient();const{data:manager,error:managerError}=await service.from("profiles").select("id").eq("id",managerId).eq("role","manager").eq("manager_active",true).maybeSingle();
 if(managerError||!manager)return{status:"error",message:"Selected manager is not active."};
 const{data,error}=await service.from("visit_requests").update({assigned_manager_id:managerId,manager_response:"pending",manager_response_at:null}).eq("id",visitId).select("id").maybeSingle();
 if(error||!data)return{status:"error",message:"Visit assignment failed."};revalidatePath("/admin/visits");revalidatePath("/manager");return{status:"success",message:"Visit assigned to manager."};
}
