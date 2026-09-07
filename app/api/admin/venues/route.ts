import { adminVenueList, updateVenueOverride } from '@/lib/server/groups';
import { verifyAdminSession } from '@/lib/server/security';

export async function GET(request: Request) {
  if (!await verifyAdminSession(request)) return Response.json({ error: 'Admin access required.' }, { status: 401 });
  return Response.json({ venues: await adminVenueList() }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(request: Request) {
  if (!await verifyAdminSession(request)) return Response.json({ error: 'Admin access required.' }, { status: 401 });
  try {
    await updateVenueOverride(await request.json());
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Could not update the venue.' }, { status: 400 });
  }
}
