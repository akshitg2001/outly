import { adminVenueList, updateVenueOverride } from '@/lib/server/groups';
import { verifyAdminSession } from '@/lib/server/security';
import { apiError, limitRequest, readJson } from '@/lib/server/request-limits';

export async function GET(request: Request) {
  if (!await verifyAdminSession(request)) return Response.json({ error: 'Admin access required.' }, { status: 401 });
  return Response.json({ venues: await adminVenueList() }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(request: Request) {
  if (!await verifyAdminSession(request)) return Response.json({ error: 'Admin access required.' }, { status: 401 });
  try {
    await limitRequest(request, 'admin-venue-update', 60, 60);
    await updateVenueOverride(await readJson<Record<string, unknown>>(request, 16_384));
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
