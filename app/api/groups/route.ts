import { createGroup } from '@/lib/server/groups';
import { apiError, limitRequest } from '@/lib/server/request-limits';

export async function POST(request: Request) {
  try {
    await limitRequest(request, 'create-group', 30, 3600);
    const input = await request.json() as { name?: string; occasion?: string; expectedSize?: number; candidateDates?: unknown };
    const origin = new URL(request.url).origin;
    return Response.json(await createGroup(input, origin), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
