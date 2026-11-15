import { Suspense } from "react";
import { VendorRequestTracker } from "../../VendorRequestTracker";
export default async function VendorRequestPage({params}:{params:Promise<{id:string}>}) {
 const {id}=await params;
 return <Suspense fallback={<main className="p-6">Loading request…</main>}><VendorRequestTracker enquiryId={id}/></Suspense>;
}
