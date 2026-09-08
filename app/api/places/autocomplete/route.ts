import { autocompleteOrigins, googleApiAvailable } from '@/lib/server/google';
import { apiError, limitRequest } from '@/lib/server/request-limits';

export async function GET(request: Request) {
  try {
    await limitRequest(request, 'autocomplete', 240, 60);
    const query = new URL(request.url).searchParams.get('q') ?? '';
    const suggestions = await autocompleteOrigins(query);
    return Response.json({ suggestions, dataMode: googleApiAvailable() ? 'live' : 'preview' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return apiError(error);
  }
}
