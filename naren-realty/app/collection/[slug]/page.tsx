import PartnerPublicBooking from "./PartnerPublicBooking";

// Partner booking pages depend on the requested partner slug and runtime catalogue data.
export const instant = false;

export default async function PartnerCollectionPage({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params;
  return <PartnerPublicBooking partnerSlug={slug}/>;
}
