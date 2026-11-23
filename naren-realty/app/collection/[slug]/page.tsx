import PartnerPublicBooking from "./PartnerPublicBooking";

export default async function PartnerCollectionPage({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params;
  return <PartnerPublicBooking partnerSlug={slug}/>;
}
