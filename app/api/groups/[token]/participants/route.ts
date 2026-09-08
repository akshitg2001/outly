import { getOwnPreferences, submitParticipant } from '@/lib/server/groups';
import type { ParticipantPreferenceInput } from '@/lib/outly-types';
import { apiError, limitRequest } from '@/lib/server/request-limits';

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    await limitRequest(request, 'participant-submit', 120, 60);
    const { token } = await context.params;
    const privateKey = request.headers.get('X-Outly-Edit-Token');
    if (privateKey) return Response.json({ participant: await getOwnPreferences(token, privateKey) }, { headers: { 'Cache-Control': 'no-store' } });
    const input = await request.json() as ParticipantPreferenceInput & { editToken?: string | null };
    return Response.json(await submitParticipant(token, input), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
