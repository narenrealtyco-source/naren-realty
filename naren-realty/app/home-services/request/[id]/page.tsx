import { Suspense } from "react";
import { VendorRequestTracker } from "../../VendorRequestTracker";
export default function VendorRequestPage({params}:{params:Promise<{id:string}>}) {
 return <Suspense fallback={<main className="p-6">Loading request…</main>}><RequestContent params={params}/></Suspense>;
}
async function RequestContent({params}:{params:Promise<{id:string}>}) {
 const {id}=await params;
 return <VendorRequestTracker enquiryId={id}/>;
}
