'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarDays, Check, ExternalLink, IndianRupee, MapPin, Route, UtensilsCrossed, Vote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { OutingPlan, PublicGroupView, Venue } from '@/lib/outly-types';
import { formatDate, formatDuration } from '@/lib/recommendation';
import { ErrorPanel, LoadingPanel, SiteHeader } from './site-header';
import { useGroup } from './use-group';

export function ResultsBoard({ token, initialView }: { token: string; initialView?: PublicGroupView }) {
  const groupState = useGroup(token, false, initialView);
  const view = groupState.view;
  const loading = groupState.loading;
  const error = groupState.error;
  const [votedPlan, setVotedPlan] = useState<string | null>(null);
  const [voteAdjustments, setVoteAdjustments] = useState<Record<string, number>>({});
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(initialView?.selectedPlanId ?? null);
  const [busy, setBusy] = useState<string | null>(null);
  const [voteError, setVoteError] = useState('');

  useEffect(() => {
    if (!view) return;
    setVotedPlan(window.localStorage.getItem(`outly_vote_${view.group.id}`));
  }, [view]);

  async function vote(plan: OutingPlan) {
    if (!view) return;
    const voterKey = window.localStorage.getItem(`outly_edit_token_${view.group.id}`) ?? '';
    setBusy(plan.id); setVoteError('');
    try {
      const response = await fetch(`/api/groups/${encodeURIComponent(token)}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'vote', planId: plan.id, voterKey }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Could not save your vote.');
      const previous = votedPlan;
      window.localStorage.setItem(`outly_vote_${view.group.id}`, plan.id); setVotedPlan(plan.id);
      if (previous !== plan.id) setVoteAdjustments((current) => ({
        ...current,
        ...(previous ? { [previous]: (current[previous] ?? 0) - 1 } : {}),
        [plan.id]: (current[plan.id] ?? 0) + 1,
      }));
    } catch (reason) { setVoteError(reason instanceof Error ? reason.message : 'Could not save your vote.'); }
    finally { setBusy(null); }
  }

  async function select(plan: OutingPlan) {
    setBusy(plan.id); setVoteError('');
    try {
      const response = await fetch(`/api/groups/${encodeURIComponent(token)}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'select_plan', planId: plan.id }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Could not choose the plan.');
      setSelectedPlanId(plan.id);
    } catch (reason) { setVoteError(reason instanceof Error ? reason.message : 'Could not choose the plan.'); }
    finally { setBusy(null); }
  }

  async function deleteResponse() {
    if (!view || view.role !== 'participant' || !window.confirm('Delete your response permanently? The group will need to agree on its plan again.')) return;
    const editToken = window.localStorage.getItem(`outly_edit_token_${view.group.id}`) ?? '';
    setBusy('delete'); setVoteError('');
    try {
      const response = await fetch(`/api/groups/${encodeURIComponent(token)}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete_participant', editToken }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Could not delete your response.');
      window.localStorage.removeItem(`outly_participant_id_${view.group.id}`); window.localStorage.removeItem(`outly_edit_token_${view.group.id}`); window.localStorage.removeItem(`outly_vote_${view.group.id}`);
      window.location.href = `/plan/${encodeURIComponent(token)}`;
    } catch (reason) { setVoteError(reason instanceof Error ? reason.message : 'Could not delete your response.'); setBusy(null); }
  }

  if (loading) return <main className="min-h-screen"><SiteHeader /><LoadingPanel label="Opening the plan board…" /></main>;
  if (error || !view) return <main className="min-h-screen"><SiteHeader /><ErrorPanel message={error || 'Plans are unavailable.'} retry={() => groupState.refresh()} /></main>;
  const plans = view.plans ?? [];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader context={`${view.group.name} · plan board`} />
      <div className="border-b-2 border-foreground bg-foreground text-background"><div className="mx-auto max-w-[1280px] px-5 py-10 lg:px-8"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f7a68e]">The group plan board</p><div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="font-heading text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">{plans.length ? `${plans.length} ${plans.length === 1 ? 'way' : 'ways'} to do` : 'Plans for'} {view.group.name}</h1><p className="mt-3 text-[#c9c7bf]">Compare the checked details and any prices still to confirm, then vote for your favourite.</p></div><div className="shrink-0 border border-[#53534f] px-4 py-3 text-sm"><strong className="block text-xl text-white">{view.submittedCount}/{view.expectedSize}</strong>people represented</div></div></div></div>
      <div className="mx-auto max-w-[1280px] px-5 py-8 lg:px-8 lg:py-12">
        {view.dataMode === 'preview' && <div className="mb-7 flex items-start gap-3 border border-[#b26a00] bg-[#fff1cf] p-4 text-sm"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><p><strong>Preview catalogue:</strong> these are example outings, not live recommendations. These plans use a small Delhi reference set and estimated travel; verify details before going.</p></div>}
        {plans.length === 0 ? <div className="border-2 border-foreground bg-card p-8 text-center"><h2 className="font-heading text-3xl font-semibold">{view.planHydrationError ? 'Live details could not be refreshed.' : 'Plans haven’t been published yet.'}</h2><p className="mt-3 text-muted-foreground">{view.planHydrationError ?? 'The organizer can generate them after locking the group agreement.'}</p>{view.planHydrationError && <Button onClick={() => groupState.refresh()} className="mt-5 rounded-none">Retry live details</Button>}</div> : <div className="space-y-8">{plans.map((plan) => <section key={plan.id}>{selectedPlanId === plan.id && <p className="mb-3 border-l-4 border-[#27734d] bg-card p-3 font-semibold text-[#27734d]">The group’s chosen plan</p>}<PlanCard plan={plan} votes={(view.votes?.[plan.id] ?? 0) + (voteAdjustments[plan.id] ?? 0)} voted={votedPlan === plan.id} busy={busy === plan.id} onVote={() => vote(plan)} />{view.role === 'organizer' && <Button onClick={() => select(plan)} disabled={Boolean(busy) || selectedPlanId === plan.id} variant="outline" className="mt-5 h-12 rounded-none border-foreground">{selectedPlanId === plan.id ? 'Selected for the group' : 'Choose this for the group'}</Button>}</section>)}</div>}
        {view.dataMode === 'live' && <p className="mt-7 text-center text-xs text-muted-foreground">Venue, photo and route information provided by Google Maps</p>}
        {view.planShortfallMessage && <p className="mx-auto mt-6 max-w-2xl border-l-4 border-[#b26a00] bg-[#fff1cf] p-4 text-sm">{view.planShortfallMessage}</p>}
        {voteError && <p className="mt-5 text-center text-sm text-destructive">{voteError}</p>}
        {plans.length > 0 && view.role === 'participant' && <FeedbackForm token={token} groupId={view.group.id} />}
        <p className="mx-auto mt-10 max-w-2xl text-center text-xs leading-5 text-muted-foreground">Outly does not track clicks on external booking links. Prices, opening hours and availability should be confirmed with the venue before payment.</p>
        {view.role === 'participant' && <button onClick={deleteResponse} disabled={Boolean(busy)} className="mx-auto mt-5 block text-sm text-destructive underline underline-offset-4">Delete my response</button>}
      </div>
    </main>
  );
}

function FeedbackForm({ token, groupId }: { token: string; groupId: string }) {
  const [score, setScore] = useState('');
  const [reuse, setReuse] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setStatus('');
    try {
      const voterKey = window.localStorage.getItem(`outly_edit_token_${groupId}`) ?? '';
      const response = await fetch(`/api/groups/${encodeURIComponent(token)}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'feedback', voterKey, usefulness: Number(score), reuse: reuse === 'yes' }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Could not save your feedback.');
      setStatus('Thanks—your feedback is saved.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Could not save your feedback.'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={save} className="mx-auto mt-12 max-w-2xl border-2 border-foreground bg-card p-6">
    <h2 className="font-heading text-2xl font-semibold">Did Outly make planning easier?</h2>
    <fieldset className="mt-5"><legend className="text-sm font-semibold">How useful are these plans? (1 = not useful, 5 = very useful)</legend>
      <RadioGroup value={score} onValueChange={setScore} className="mt-3 flex flex-wrap gap-4">{[1, 2, 3, 4, 5].map((value) => <label key={value} className="flex items-center gap-2 border border-border px-3 py-2"><RadioGroupItem value={String(value)} />{value}</label>)}</RadioGroup>
    </fieldset>
    <fieldset className="mt-5"><legend className="text-sm font-semibold">Would you use Outly for another outing?</legend><RadioGroup value={reuse} onValueChange={setReuse} className="mt-3 flex gap-5"><label className="flex gap-2"><RadioGroupItem value="yes" />Yes</label><label className="flex gap-2"><RadioGroupItem value="no" />No</label></RadioGroup></fieldset>
    <Button type="submit" disabled={!score || !reuse || busy} className="mt-5 rounded-none">{busy ? 'Saving…' : 'Save feedback'}</Button>
    {status && <p role="status" className="mt-3 text-sm">{status}</p>}
  </form>;
}

function PlanCard({ plan, votes, voted, busy, onVote }: { plan: OutingPlan; votes: number; voted: boolean; busy: boolean; onVote: () => void }) {
  const photo = plan.stops.find((stop) => stop.venue.imageUrl)?.venue.imageUrl;
  const photoCredits = plan.stops.flatMap((stop) => stop.venue.photoAttributions ?? []);
  return <article className="border-2 border-foreground bg-card shadow-[8px_8px_0_#111]"><div className="grid lg:grid-cols-[0.72fr_1.28fr]">{photo ? <div className="relative min-h-72 border-b-2 border-foreground lg:border-b-0 lg:border-r-2"><img src={photo} alt={`${plan.stops[0].venue.name}, ${plan.area}`} className="absolute inset-0 h-full w-full object-cover" /><span className="absolute left-4 top-4 bg-signal px-3 py-1.5 text-xs font-bold uppercase tracking-[.12em] text-white">Plan {String(plan.rank).padStart(2, '0')}</span>{photoCredits.length > 0 && <span className="absolute bottom-2 left-2 bg-black/75 px-2 py-1 text-[10px] text-white">Photo: {photoCredits.map((credit, index) => credit.uri ? <a key={`${credit.displayName}-${index}`} href={credit.uri} target="_blank" rel="noreferrer" className="underline">{credit.displayName}</a> : credit.displayName).reduce<React.ReactNode[]>((all, item, index) => index ? [...all, ', ', item] : [item], [])}</span>}</div> : <div className="relative grid min-h-64 place-items-center overflow-hidden border-b-2 border-foreground bg-[#1d1d1c] p-7 text-[#f5f1e8] lg:border-b-0 lg:border-r-2"><div className="city-grid absolute inset-0 opacity-20" /><div className="relative text-center"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#f7a68e]">{plan.area}</p><p className="mt-3 font-heading text-4xl font-semibold">Plan {String(plan.rank).padStart(2, '0')}</p></div></div>}
      <div className="p-5 sm:p-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="eyebrow">{plan.label}</p><h2 className="mt-2 max-w-2xl font-heading text-3xl font-semibold tracking-[-0.04em]">{plan.title}</h2><p className="mt-3 max-w-2xl leading-7 text-muted-foreground">{plan.summary}</p></div><div className="shrink-0 border-2 border-foreground px-3 py-2 text-center"><strong className="block text-lg">{plan.fitCount}/{plan.participantCount} included</strong><span className="text-xs text-muted-foreground">{plan.hasUnknownActivityCost || plan.hasUnknownDiningCost || plan.hoursVerificationRequired ? 'Details to confirm' : 'Checked constraints'}</span></div></div>
      <div className="mt-6 grid gap-px border border-border bg-border sm:grid-cols-4">{[[<CalendarDays key="c" className="size-4" />, formatDate(plan.date)], [<MapPin key="m" className="size-4" />, plan.area], [<IndianRupee key="i" className="size-4" />, `₹${plan.knownCost.toLocaleString('en-IN')} known`], [<Route key="r" className="size-4" />, `${Math.max(...plan.travel.map((item) => item.minutes))} min max`]].map(([icon, value], index) => <div key={index} className="flex items-center gap-2 bg-card p-3 text-sm">{icon}{value}</div>)}</div>
      <div className="mt-7 border-l-2 border-foreground">{plan.stops.map((stop, index) => <div key={stop.venue.id} className="relative grid gap-3 border-b border-border py-5 pl-6 first:pt-0 sm:grid-cols-[1fr_auto]"><span className="absolute -left-[9px] top-5 grid size-4 place-items-center rounded-full bg-foreground text-[9px] text-background first:top-0">{index + 1}</span><div><p className="text-xs font-bold uppercase tracking-[.12em] text-signal">{stop.time} · {formatDuration(stop.durationMinutes)}</p><h3 className="mt-1 text-lg font-semibold">{stop.venue.name}</h3><VenueRating venue={stop.venue} /><p className="mt-1 text-sm text-muted-foreground">{stop.kind === 'dining' ? <><UtensilsCrossed className="mr-1 inline size-3.5" />{stop.venue.address}</> : stop.venue.address}</p><a href={stop.actionUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold underline decoration-signal decoration-2 underline-offset-4">{stop.actionLabel}<ExternalLink className="size-3.5" /></a></div><p className="text-sm font-semibold sm:text-right">{stop.priceLabel}</p></div>)}</div>
      {Boolean(plan.diningAlternatives?.length) && <div className="mt-6 border border-foreground bg-background p-4 sm:p-5"><p className="eyebrow">Choose with the group’s mood</p><h3 className="mt-1 font-heading text-2xl font-semibold">More restaurants that still fit</h3><p className="mt-2 text-sm text-muted-foreground">Every option below was checked against the accepted timing, travel, dietary and known-cost limits.</p><div className="mt-4 grid gap-3 md:grid-cols-2">{plan.diningAlternatives!.map((option, index) => <article key={option.venue.placeId} className="border border-border bg-card p-4"><p className="text-xs font-bold uppercase tracking-[.12em] text-signal">{diningMood(option.venue.primaryType, option.venue.priceLevel, index)}</p><h4 className="mt-1 text-lg font-semibold">{option.venue.name}</h4><VenueRating venue={option.venue} /><p className="mt-1 text-sm text-muted-foreground">{option.venue.address}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span>{option.transferMinutes} min from the activity</span><span>{option.time}</span><span>{option.hasUnknownCost ? 'Price to verify' : `₹${option.knownPlanCost.toLocaleString('en-IN')} known total`}</span></div><a href={option.actionUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold underline decoration-signal decoration-2 underline-offset-4">{option.actionLabel}<ExternalLink className="size-3.5" /></a></article>)}</div></div>}
      <div className="mt-6 grid gap-4 border-t border-border pt-5 sm:grid-cols-[1fr_auto]"><div><p className="text-sm font-semibold">Why it works</p><ul className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">{plan.reasons.slice(0, 4).map((reason) => <li key={reason} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-[#27734d]" />{reason}</li>)}</ul>{(plan.hasUnknownActivityCost || plan.hasUnknownDiningCost) && <p className="mt-3 text-xs font-semibold text-[#9a5400]">Some venue prices must be checked; unknown prices are excluded from the known-cost total.</p>}{plan.dietaryVerificationRequired && <p className="mt-2 text-xs font-semibold text-[#9a5400]">Confirm the group’s dietary requirements directly with the venue.</p>}</div><Button onClick={onVote} disabled={busy} className={`h-12 rounded-none px-5 ${voted ? 'bg-[#27734d] text-white' : 'bg-foreground text-background'}`}>{busy ? 'Saving…' : voted ? 'Your vote' : 'Vote for this'} <Vote className="ml-2 size-4" /></Button></div><p className="mt-3 text-right text-xs text-muted-foreground">{votes} {votes === 1 ? 'vote' : 'votes'}</p>
  </div></div></article>;
}

function VenueRating({ venue }: { venue: Venue }) {
  if (venue.rating === null) return <p className="mt-1 text-xs text-muted-foreground">No public rating available</p>;
  const reviews = venue.ratingCount === null
    ? ''
    : ` · ${venue.ratingCount.toLocaleString('en-IN')} ${venue.source === 'google_places' ? 'Google ' : ''}${venue.ratingCount === 1 ? 'review' : 'reviews'}`;
  return <p className="mt-1 text-xs font-semibold text-muted-foreground" aria-label={`${venue.rating.toFixed(1)} out of 5${reviews}`}><span aria-hidden="true" className="text-[#b26a00]">★</span> {venue.rating.toFixed(1)}{reviews}</p>;
}

function diningMood(primaryType: string | null, priceLevel: string | null, index: number) {
  const type = primaryType?.replaceAll('_', ' ').replace(/\brestaurant\b/i, '').trim();
  if (type) return `In the mood for ${type}`;
  if (priceLevel?.includes('INEXPENSIVE')) return 'Keep it easy-going';
  if (priceLevel?.includes('EXPENSIVE')) return 'Make it a treat';
  return index === 0 ? 'A different flavour' : 'Another group-friendly option';
}
