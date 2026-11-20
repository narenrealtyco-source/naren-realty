"use client";
import {useEffect} from "react";
import {useRouter} from "next/navigation";
export default function PartnerAutoRefresh(){
 const router=useRouter();
 useEffect(()=>{const id=window.setInterval(()=>router.refresh(),45000);return()=>window.clearInterval(id);},[router]);
 return null;
}
