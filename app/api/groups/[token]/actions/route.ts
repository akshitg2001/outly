import {
  approveRelaxation,
  createRelaxation,
  generatePlans,
  lockGroup,
  unlockGroup,
  voteForPlan,
} from '@/lib/server/groups';

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const input = await request.json() as Record<string, unknown>;
    const action = String(input.action ?? '');
    if (action === 'propose_relaxation') return Response.json(await createRelaxation(token));
    if (action === 'approve_relaxation') return Response.json(await approveRelaxation(token, String(input.editToken ?? '')));
    if (action === 'lock') return Response.json({ agreement: await lockGroup(token) });
    if (action === 'unlock') { await unlockGroup(token); return Response.json({ ok: true }); }
    if (action === 'generate_plans') return Response.json(await generatePlans(token));
    if (action === 'vote') { await voteForPlan(token, String(input.planId ?? ''), String(input.voterKey ?? '')); return Response.json({ ok: true }); }
    return Response.json({ error: 'Unknown group action.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Could not complete that action.' }, { status: 400 });
  }
}
