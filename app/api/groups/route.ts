import { createGroup } from '@/lib/server/groups';
import { apiError, limitRequest, readJson } from '@/lib/server/request-limits';

export async function POST(request: Request) {
  try {
    await limitRequest(request, 'create-group', 30, 3600);
    const input = await readJson<{ name?: string; occasion?: string; expectedSize?: number; candidateDates?: unknown }>(request, 8_192);
    const origin = new URL(request.url).origin;
    return Response.json(await createGroup(input, origin), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
