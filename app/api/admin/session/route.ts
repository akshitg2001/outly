import { adminCookie, createAdminSession, verifyAdminSession } from '@/lib/server/security';
import { runtimeValue } from '@/lib/server/runtime';

export async function GET(request: Request) {
  return Response.json({ authenticated: await verifyAdminSession(request), configured: Boolean(runtimeValue('ADMIN_PASSCODE')) });
}

export async function POST(request: Request) {
  try {
    const input = await request.json() as { passcode?: string };
    const expected = runtimeValue('ADMIN_PASSCODE');
    if (!expected) return Response.json({ error: 'Set ADMIN_PASSCODE before using the admin area.' }, { status: 503 });
    if (input.passcode !== expected) return Response.json({ error: 'Incorrect passcode.' }, { status: 401 });
    const session = await createAdminSession();
    return Response.json({ authenticated: true }, { headers: { 'Set-Cookie': adminCookie(session, new URL(request.url).protocol === 'https:') } });
  } catch {
    return Response.json({ error: 'Could not start the admin session.' }, { status: 400 });
  }
}

export async function DELETE() {
  return Response.json({ authenticated: false }, { headers: { 'Set-Cookie': 'outly_admin=; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=0' } });
}
