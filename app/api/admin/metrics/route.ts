import { pilotMetrics, runPrivacyCleanup } from '@/lib/server/groups';
import { verifyAdminSession } from '@/lib/server/security';
import { apiError, limitRequest } from '@/lib/server/request-limits';

export async function GET(request: Request) {
  if (!await verifyAdminSession(request)) return Response.json({ error: 'Admin access required.' }, { status: 401 });
  await runPrivacyCleanup();
  return Response.json(await pilotMetrics(), { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  if (!await verifyAdminSession(request)) return Response.json({ error: 'Admin access required.' }, { status: 401 });
  try {
    await limitRequest(request, 'admin-cleanup', 10, 3600);
    return Response.json(await runPrivacyCleanup(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}
