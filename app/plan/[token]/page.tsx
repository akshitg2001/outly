import { ParticipantExperience } from '@/components/outly/participant-experience';

export default async function ParticipantPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ParticipantExperience token={token} />;
}
