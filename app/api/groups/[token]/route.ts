import { getGroupView } from '@/lib/server/groups';

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    return Response.json(await getGroupView(token), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Could not load this outing.' }, { status: 404 });
  }
}
