import Link from "next/link";
import { connection } from "next/server";
import { requireAdmin } from "../../lib/supabase-server";
import { createSupabaseServiceClient } from "../../lib/supabase-service";
import AccountAccessButton from "../../components/AccountAccessButton";

export const instant=false;
type Profile={id:string;full_name:string|null;phone:string|null;role:string;registration_category:string|null;created_at:string};
export default async function AdminAccountsPage(){
 await connection();
 try{await requireAdmin();}catch{return <main className="p-6">Admin authorization required. <Link href="/admin/login" className="underline">Login</Link></main>;}
 const service=createSupabaseServiceClient();
 const [{data:profiles,error},{data:authData,error:authError}]=await Promise.all([
  service.from("profiles").select("id,full_name,phone,role,registration_category,created_at").in("role",["customer","manager"]).order("created_at",{ascending:false}).limit(500).overrideTypes<Profile[],{merge:false}>(),
  service.auth.admin.listUsers({page:1,perPage:1000})
 ]);
 if(error||authError)return <main className="p-6"><Link href="/admin" className="underline">← Admin</Link><p role="alert" className="mt-4 text-rose-700">Accounts could not be loaded.</p></main>;
 const users=new Map((authData.users??[]).map(user=>[user.id,user]));
 const rows=profiles??[];
 return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8"><div className="mx-auto max-w-5xl"><Link href="/admin" className="text-sm underline">← Admin Dashboard</Link><h1 className="mt-4 text-3xl font-bold text-[#10243A]">Customer & Owner Accounts</h1><p className="mt-2 text-sm text-slate-600">Deactivate access without deleting linked listings, enquiries, requirements or referral history.</p><div className="mt-5 space-y-3">{rows.map(profile=>{const user=users.get(profile.id);const banned=Boolean(user?.banned_until&&new Date(user.banned_until)>new Date());return <article key={profile.id} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">{profile.full_name||"Account"}</h2><p className="text-sm text-slate-600">{profile.phone||"No phone"} · {profile.role==="manager"?"Manager":profile.registration_category||"Customer / Owner"}</p><p className="mt-1 break-all text-xs text-slate-500">ID: {profile.id}</p></div><span className={banned?"rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700":"rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"}>{banned?"Deactivated":"Active"}</span></div><AccountAccessButton id={profile.id} banned={banned}/></article>})}</div>{rows.length===0&&<p className="mt-5 rounded-xl border bg-white p-5">No customer or manager accounts found.</p>}</div></main>;
}
