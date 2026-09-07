import { pilotMetrics, purgeExpiredOrigins } from '@/lib/server/groups';
import { verifyAdminSession } from '@/lib/server/security';

export async function GET(request: Request) {
  if (!await verifyAdminSession(request)) return Response.json({ error: 'Admin access required.' }, { status: 401 });
  await purgeExpiredOrigins();
  return Response.json(await pilotMetrics(), { headers: { 'Cache-Control': 'no-store' } });
}
