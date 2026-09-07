import { submitParticipant } from '@/lib/server/groups';
import type { ParticipantPreferenceInput } from '@/lib/outly-types';

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const input = await request.json() as ParticipantPreferenceInput & { editToken?: string | null };
    return Response.json(await submitParticipant(token, input), { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Could not save your preferences.' }, { status: 400 });
  }
}
