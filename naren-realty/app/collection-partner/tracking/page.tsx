import PartnerDashboardView from "../PartnerDashboardView";

export default function CollectionPartnerSection({searchParams}:{searchParams?:Promise<{q?:string;rate_q?:string}>}) {
 return <PartnerDashboardView searchParams={searchParams} tab="tracking"/>;
}
