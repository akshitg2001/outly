import { autocompleteOrigins, googleApiAvailable } from '@/lib/server/google';

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams.get('q') ?? '';
    const suggestions = await autocompleteOrigins(query);
    return Response.json({ suggestions, dataMode: googleApiAvailable() ? 'live' : 'preview' }, { headers: { 'Cache-Control': 'private, max-age=300' } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Location search is unavailable.' }, { status: 502 });
  }
}
