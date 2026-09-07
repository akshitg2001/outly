import { runtimeValue } from '@/lib/server/runtime';

export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get('name') ?? '';
  const key = runtimeValue('GOOGLE_MAPS_API_KEY');
  if (!key || !/^places\/[^/]+\/photos\/[^/]+$/.test(name)) return new Response('Photo unavailable', { status: 404 });
  const response = await fetch(`https://places.googleapis.com/v1/${name}/media?maxWidthPx=1200&skipHttpRedirect=true`, {
    headers: { 'X-Goog-Api-Key': key },
  });
  if (!response.ok) return new Response('Photo unavailable', { status: 404 });
  const payload = await response.json() as { photoUri?: string };
  if (!payload.photoUri) return new Response('Photo unavailable', { status: 404 });
  const image = await fetch(payload.photoUri);
  if (!image.ok || !image.body) return new Response('Photo unavailable', { status: 404 });
  return new Response(image.body, {
    headers: {
      'Content-Type': image.headers.get('Content-Type') ?? 'image/jpeg',
      'Cache-Control': 'public, max-age=21600',
    },
  });
}
