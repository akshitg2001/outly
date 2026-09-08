import {
  approveRelaxation,
  createRelaxation,
  generatePlans,
  lockGroup,
  unlockGroup,
  voteForPlan,
  selectFinalPlan,
  saveFeedback,
  deleteParticipant,
  deleteGroup,
} from '@/lib/server/groups';
import { apiError, enforceLimit, limitRequest, readJson } from '@/lib/server/request-limits';

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    await limitRequest(request, 'group-actions', 120, 60);
    const input = await readJson<Record<string, unknown>>(request, 8_192);
    const action = String(input.action ?? '');
    if (action === 'propose_relaxation') return Response.json(await createRelaxation(token));
    if (action === 'approve_relaxation') return Response.json(await approveRelaxation(token, String(input.editToken ?? '')));
    if (action === 'lock') return Response.json({ agreement: await lockGroup(token) });
    if (action === 'unlock') { await unlockGroup(token); return Response.json({ ok: true }); }
    if (action === 'generate_plans') { await enforceLimit('plan-generation', token, 6, 600); return Response.json(await generatePlans(token)); }
    if (action === 'vote') { await voteForPlan(token, String(input.planId ?? ''), String(input.voterKey ?? '')); return Response.json({ ok: true }); }
    if (action === 'select_plan') { await selectFinalPlan(token, String(input.planId ?? '')); return Response.json({ ok: true }); }
    if (action === 'feedback') { await saveFeedback(token, String(input.voterKey ?? ''), Number(input.usefulness), input.reuse as boolean); return Response.json({ ok: true }); }
    if (action === 'delete_participant') { await deleteParticipant(token, String(input.editToken ?? '')); return Response.json({ ok: true }); }
    if (action === 'delete_group') { await deleteGroup(token); return Response.json({ ok: true }); }
    return Response.json({ error: 'Unknown group action.' }, { status: 400 });
  } catch (error) {
    return apiError(error);
  }
}
