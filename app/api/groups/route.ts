import { createGroup } from '@/lib/server/groups';

export async function POST(request: Request) {
  try {
    const input = await request.json() as { name?: string; occasion?: string; expectedSize?: number; candidateDates?: unknown };
    const origin = new URL(request.url).origin;
    return Response.json(await createGroup(input, origin), { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Could not create the outing.' }, { status: 400 });
  }
}
