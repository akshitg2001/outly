import { ResultsBoard } from '@/components/outly/results-board';

export default async function ResultsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ResultsBoard token={token} />;
}
