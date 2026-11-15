import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
export async function proxy(request: NextRequest) {
 let response=NextResponse.next({request});
 const supabase=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{cookies:{getAll(){return request.cookies.getAll();},setAll(items){items.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});items.forEach(({name,value,options})=>response.cookies.set(name,value,options));}}});
 const path=request.nextUrl.pathname,admin=path==="/admin"||path.startsWith("/admin/"),manager=path==="/manager"||path.startsWith("/manager/");
 if((!admin&&!manager)||path==="/admin/login"||path==="/manager/login")return response;
 const login=manager?"/manager/login":"/admin/login";const{data:{user},error}=await supabase.auth.getUser();if(error||!user)return NextResponse.redirect(new URL(login,request.url));
 const{data:p,error:pe}=await supabase.from("profiles").select("role,manager_active").eq("id",user.id).maybeSingle();if(pe)return NextResponse.redirect(new URL(login,request.url));
 if(admin&&p?.role!=="admin")return NextResponse.redirect(new URL(p?.role==="manager"&&p.manager_active?"/manager":"/admin/login",request.url));
 if(manager&&(p?.role!=="manager"||p.manager_active!==true))return NextResponse.redirect(new URL("/manager/login",request.url));
 return response;
}
export const config={matcher:["/admin","/admin/:path*","/manager","/manager/:path*"]};
