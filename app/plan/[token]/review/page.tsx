import { OrganizerDashboard } from '@/components/outly/organizer-dashboard';

export default async function ReviewPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ join?: string }> }) {
  const { token } = await params;
  const { join } = await searchParams;
  return <OrganizerDashboard token={token} joinToken={join} />;
}
