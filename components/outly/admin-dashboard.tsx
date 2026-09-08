'use client';

import { useCallback, useEffect, useState } from 'react';
import { BarChart3, CheckCircle2, Database, ExternalLink, LockKeyhole, Pencil, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ErrorPanel, LoadingPanel, SiteHeader } from './site-header';

type VenueRow = {
  place_id: string; name: string; kind: string; area: string | null; booking_url: string | null; website_url: string | null; google_maps_url: string | null;
  price_min: number | null; price_max: number | null; duration_minutes: number | null; dietary: string; enabled: number; source: string; refreshed_at: number;
};
type Metrics = { pilotStartAt: string | null; totals: Record<string, number | null>; rates: { inviteCompletionPercent: number; generationSuccessPercent: number; conflictAcceptancePercent: number }; events: Array<{ event_name: string; count: number }> };

export function AdminDashboard() {
  const [checking, setChecking] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [selected, setSelected] = useState<VenueRow | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setChecking(true);
    try {
      const session = await fetch('/api/admin/session', { cache: 'no-store' });
      const status = await session.json() as { authenticated: boolean; configured: boolean };
      setConfigured(status.configured); setAuthenticated(status.authenticated);
      if (status.authenticated) {
        const [metricsResponse, venuesResponse] = await Promise.all([fetch('/api/admin/metrics', { cache: 'no-store' }), fetch('/api/admin/venues', { cache: 'no-store' })]);
        const metricsPayload = await metricsResponse.json() as Metrics;
        const venuesPayload = await venuesResponse.json() as { venues: VenueRow[] };
        setMetrics(metricsPayload); setVenues(venuesPayload.venues ?? []);
      }
    } catch { setError('Could not load the pilot dashboard.'); }
    finally { setChecking(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function signIn() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Could not sign in.');
      setAuthenticated(true); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not sign in.'); }
    finally { setBusy(false); }
  }

  async function saveVenue() {
    if (!selected) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/venues', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        placeId: selected.place_id, bookingUrl: selected.booking_url, websiteUrl: selected.website_url, priceMin: selected.price_min, priceMax: selected.price_max,
        durationMinutes: selected.duration_minutes, dietary: JSON.parse(selected.dietary || '[]'), enabled: Boolean(selected.enabled),
      }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Could not save the venue.');
      setSelected(null); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save the venue.'); }
    finally { setBusy(false); }
  }

  async function cleanup() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/metrics', { method: 'POST' });
      const payload = await response.json() as { originsRemoved?: number; error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Could not run the cleanup.');
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not run the cleanup.'); }
    finally { setBusy(false); }
  }

  if (checking) return <main className="min-h-screen"><SiteHeader context="Pilot operations" /><LoadingPanel label="Opening the pilot dashboard…" /></main>;
  if (!configured) return <main className="min-h-screen"><SiteHeader context="Pilot operations" /><ErrorPanel message="Admin access is not configured yet. Add the ADMIN_PASSCODE secret to the hosted site, then reload this page." /></main>;
  if (!authenticated) return <main className="min-h-screen bg-background"><SiteHeader context="Pilot operations" /><div className="mx-auto max-w-md px-5 py-20"><LockKeyhole className="size-9 text-signal" /><p className="eyebrow mt-6">Private operations</p><h1 className="mt-2 font-heading text-4xl font-semibold">Open the pilot desk.</h1><p className="mt-3 text-muted-foreground">This area contains aggregate pilot metrics and venue corrections.</p><form onSubmit={(event) => { event.preventDefault(); void signIn(); }} className="mt-8"><label className="field-label">Admin passcode<Input type="password" value={passcode} onChange={(event) => setPasscode(event.target.value)} className="editorial-input mt-2" autoComplete="current-password" /></label>{error && <p className="mt-3 text-sm text-destructive">{error}</p>}<Button type="submit" disabled={!passcode || busy} className="mt-5 h-12 w-full rounded-none bg-foreground text-background">{busy ? 'Checking…' : 'Open dashboard'}</Button></form></div></main>;

  const totals = metrics?.totals ?? {};
  return <main className="min-h-screen bg-background text-foreground"><SiteHeader context="Pilot operations" /><div className="mx-auto max-w-[1280px] px-5 py-8 lg:px-8 lg:py-12"><div className="flex flex-col justify-between gap-4 border-b-2 border-foreground pb-6 sm:flex-row sm:items-end"><div><p className="eyebrow">Pilot desk</p><h1 className="mt-2 font-heading text-4xl font-semibold">What groups are doing</h1><p className="mt-2 text-muted-foreground">First-party workflow signals only. External booking clicks are not recorded.</p></div><Button variant="outline" onClick={() => load()} className="rounded-none border-foreground"><RefreshCw />Refresh</Button></div>
  <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric icon={<Users />} label="Groups created" value={totals.groups_created ?? 0} /><Metric icon={<CheckCircle2 />} label="Invite completion" value={`${metrics?.rates.inviteCompletionPercent ?? 0}%`} /><Metric icon={<BarChart3 />} label="Generation success" value={`${metrics?.rates.generationSuccessPercent ?? 0}%`} /><Metric icon={<Database />} label="Final selections" value={totals.final_selections ?? 0} /><Metric icon={<Users />} label="Avg. time to lock" value={totals.average_minutes_to_lock === null ? '—' : `${totals.average_minutes_to_lock} min`} /><Metric icon={<CheckCircle2 />} label="Conflict acceptance" value={`${metrics?.rates.conflictAcceptancePercent ?? 0}%`} /><Metric icon={<BarChart3 />} label="Usefulness / 5" value={totals.average_usefulness ?? '—'} /><Metric icon={<RefreshCw />} label="Would reuse" value={totals.reuse_percent === null ? '—' : `${totals.reuse_percent}%`} /></div>
  <div className="mt-9 grid gap-7 xl:grid-cols-[1fr_360px]"><section><div className="mb-4 flex items-end justify-between"><div><p className="eyebrow">Venue corrections</p><h2 className="mt-1 font-heading text-2xl font-semibold">Recently used places</h2></div><span className="text-sm text-muted-foreground">{venues.length} cached</span></div><div className="border-2 border-foreground bg-card"><Table><TableHeader><TableRow><TableHead>Venue</TableHead><TableHead>Type</TableHead><TableHead>Area</TableHead><TableHead>Known cost</TableHead><TableHead><span className="sr-only">Edit</span></TableHead></TableRow></TableHeader><TableBody>{venues.length ? venues.map((venue) => <TableRow key={venue.place_id}><TableCell><p className="font-medium">{venue.name}</p><p className="text-xs text-muted-foreground">{venue.source.replaceAll('_', ' ')}</p></TableCell><TableCell className="capitalize">{venue.kind}</TableCell><TableCell>{venue.area ?? '—'}</TableCell><TableCell>{venue.price_max === null ? 'Unknown' : `₹${venue.price_min ?? 0}–₹${venue.price_max}`}</TableCell><TableCell><button onClick={() => setSelected({ ...venue })} aria-label={`Edit ${venue.name}`} className="grid size-9 place-items-center border border-border hover:border-foreground"><Pencil className="size-4" /></button></TableCell></TableRow>) : <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Venues appear after the first plan generation.</TableCell></TableRow>}</TableBody></Table></div></section>
  <aside className="h-fit border-2 border-foreground bg-card p-5"><p className="eyebrow">Validation funnel</p><p className="mt-2 text-xs text-muted-foreground">{metrics?.pilotStartAt ? `Reporting from ${metrics.pilotStartAt}` : 'Pilot start is not configured; all activity is shown.'}</p><div className="mt-4 space-y-3">{metrics?.events.length ? metrics.events.map((event) => <div key={event.event_name} className="flex items-center justify-between border-b border-border pb-2 text-sm"><span>{event.event_name.replaceAll('_', ' ')}</span><strong>{event.count}</strong></div>) : <p className="text-sm text-muted-foreground">No workflow events yet.</p>}</div><Button variant="outline" onClick={cleanup} disabled={busy} className="mt-5 w-full rounded-none border-foreground">Run privacy cleanup</Button></aside></div>
  {selected && <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/45" onMouseDown={() => setSelected(null)}><div className="h-full w-full max-w-lg overflow-y-auto border-l-2 border-foreground bg-background p-6 sm:p-8" onMouseDown={(event) => event.stopPropagation()}><p className="eyebrow">Venue override</p><h2 className="mt-2 font-heading text-3xl font-semibold">{selected.name}</h2><p className="mt-2 text-sm text-muted-foreground">Only verified corrections should be entered here. External links must use HTTPS.</p><div className="mt-7 space-y-5"><label className="field-label">Direct booking link<Input value={selected.booking_url ?? ''} onChange={(event) => setSelected({ ...selected, booking_url: event.target.value })} placeholder="https://…" className="editorial-input mt-2" /></label><label className="field-label">Official website<Input value={selected.website_url ?? ''} onChange={(event) => setSelected({ ...selected, website_url: event.target.value })} placeholder="https://…" className="editorial-input mt-2" /></label><div className="grid grid-cols-2 gap-3"><label className="field-label">Price from<Input type="number" value={selected.price_min ?? ''} onChange={(event) => setSelected({ ...selected, price_min: event.target.value ? Number(event.target.value) : null })} className="editorial-input mt-2" /></label><label className="field-label">Price up to<Input type="number" value={selected.price_max ?? ''} onChange={(event) => setSelected({ ...selected, price_max: event.target.value ? Number(event.target.value) : null })} className="editorial-input mt-2" /></label></div><label className="field-label">Typical duration (minutes)<Input type="number" value={selected.duration_minutes ?? ''} onChange={(event) => setSelected({ ...selected, duration_minutes: event.target.value ? Number(event.target.value) : null })} className="editorial-input mt-2" /></label><label className="flex items-center gap-3 border border-foreground p-3 text-sm font-medium"><Checkbox checked={Boolean(selected.enabled)} onCheckedChange={(value) => setSelected({ ...selected, enabled: value ? 1 : 0 })} />Allow this venue in plans</label>{selected.google_maps_url && <a href={selected.google_maps_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold underline decoration-signal decoration-2 underline-offset-4">Check on Google Maps <ExternalLink className="size-4" /></a>}{error && <p className="text-sm text-destructive">{error}</p>}<div className="flex gap-3"><Button onClick={saveVenue} disabled={busy} className="h-12 flex-1 rounded-none bg-signal text-white">{busy ? 'Saving…' : 'Save verified details'}</Button><Button variant="outline" onClick={() => setSelected(null)} className="h-12 rounded-none border-foreground">Cancel</Button></div></div></div></div>}
  </div></main>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) { return <div className="border-2 border-foreground bg-card p-5"><span className="[&>svg]:size-4 [&>svg]:text-signal">{icon}</span><strong className="mt-5 block text-3xl">{value}</strong><p className="mt-1 text-sm text-muted-foreground">{label}</p></div>; }
