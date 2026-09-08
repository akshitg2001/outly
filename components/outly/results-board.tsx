'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarDays, Check, ExternalLink, IndianRupee, MapPin, Route, UtensilsCrossed, Vote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { OutingPlan, PublicGroupView } from '@/lib/outly-types';
import { formatDate, formatDuration } from '@/lib/recommendation';
import { ErrorPanel, LoadingPanel, SiteHeader } from './site-header';
import { useGroup } from './use-group';

export function ResultsBoard({ token, initialView }: { token: string; initialView?: PublicGroupView }) {
  const groupState = useGroup(token);
  const view = initialView ?? groupState.view;
  const loading = initialView ? false : groupState.loading;
  const error = initialView ? '' : groupState.error;
  const [votedPlan, setVotedPlan] = useState<string | null>(null);
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
      window.localStorage.setItem(`outly_vote_${view.group.id}`, plan.id); setVotedPlan(plan.id); await groupState.refresh();
    } catch (reason) { setVoteError(reason instanceof Error ? reason.message : 'Could not save your vote.'); }
    finally { setBusy(null); }
  }

  async function select(plan: OutingPlan) {
    setBusy(plan.id); setVoteError('');
    try {
      const response = await fetch(`/api/groups/${encodeURIComponent(token)}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'select_plan', planId: plan.id }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Could not choose the plan.');
      await groupState.refresh();
    } catch (reason) { setVoteError(reason instanceof Error ? reason.message : 'Could not choose the plan.'); }
    finally { setBusy(null); }
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
        {plans.length === 0 ? <div className="border-2 border-foreground bg-card p-8 text-center"><h2 className="font-heading text-3xl font-semibold">Plans haven’t been published yet.</h2><p className="mt-3 text-muted-foreground">The organizer can generate them after locking the group agreement.</p></div> : <div className="space-y-8">{plans.map((plan) => <section key={plan.id}>{view.selectedPlanId === plan.id && <p className="mb-3 border-l-4 border-[#27734d] bg-card p-3 font-semibold text-[#27734d]">The group’s chosen plan</p>}<PlanCard plan={plan} votes={view.votes?.[plan.id] ?? 0} voted={votedPlan === plan.id} busy={busy === plan.id} onVote={() => vote(plan)} />{view.role === 'organizer' && <Button onClick={() => select(plan)} disabled={Boolean(busy) || view.selectedPlanId === plan.id} variant="outline" className="mt-5 h-12 rounded-none border-foreground">{view.selectedPlanId === plan.id ? 'Selected for the group' : 'Choose this for the group'}</Button>}</section>)}</div>}
        {voteError && <p className="mt-5 text-center text-sm text-destructive">{voteError}</p>}
        {plans.length > 0 && view.role === 'participant' && <FeedbackForm token={token} groupId={view.group.id} />}
        <p className="mx-auto mt-10 max-w-2xl text-center text-xs leading-5 text-muted-foreground">Outly does not track clicks on external booking links. Prices, opening hours and availability should be confirmed with the venue before payment.</p>
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
  return <article className="border-2 border-foreground bg-card shadow-[8px_8px_0_#111]"><div className="grid lg:grid-cols-[0.72fr_1.28fr]">{photo ? <div className="relative min-h-72 border-b-2 border-foreground lg:border-b-0 lg:border-r-2"><img src={photo} alt={`${plan.stops[0].venue.name}, ${plan.area}`} className="absolute inset-0 h-full w-full object-cover" /><span className="absolute left-4 top-4 bg-signal px-3 py-1.5 text-xs font-bold uppercase tracking-[.12em] text-white">Plan {String(plan.rank).padStart(2, '0')}</span></div> : <div className="relative grid min-h-64 place-items-center overflow-hidden border-b-2 border-foreground bg-[#1d1d1c] p-7 text-[#f5f1e8] lg:border-b-0 lg:border-r-2"><div className="city-grid absolute inset-0 opacity-20" /><div className="relative text-center"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#f7a68e]">{plan.area}</p><p className="mt-3 font-heading text-4xl font-semibold">Plan {String(plan.rank).padStart(2, '0')}</p></div></div>}
      <div className="p-5 sm:p-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="eyebrow">{plan.label}</p><h2 className="mt-2 max-w-2xl font-heading text-3xl font-semibold tracking-[-0.04em]">{plan.title}</h2><p className="mt-3 max-w-2xl leading-7 text-muted-foreground">{plan.summary}</p></div><div className="shrink-0 border-2 border-foreground px-3 py-2 text-center"><strong className="block text-lg">{plan.fitCount}/{plan.participantCount} included</strong><span className="text-xs text-muted-foreground">{plan.hasUnknownActivityCost || plan.hasUnknownDiningCost || plan.hoursVerificationRequired ? 'Details to confirm' : 'Checked constraints'}</span></div></div>
      <div className="mt-6 grid gap-px border border-border bg-border sm:grid-cols-4">{[[<CalendarDays key="c" className="size-4" />, formatDate(plan.date)], [<MapPin key="m" className="size-4" />, plan.area], [<IndianRupee key="i" className="size-4" />, `₹${plan.knownCost.toLocaleString('en-IN')} known`], [<Route key="r" className="size-4" />, `${Math.max(...plan.travel.map((item) => item.minutes))} min max`]].map(([icon, value], index) => <div key={index} className="flex items-center gap-2 bg-card p-3 text-sm">{icon}{value}</div>)}</div>
      <div className="mt-7 border-l-2 border-foreground">{plan.stops.map((stop, index) => <div key={stop.venue.id} className="relative grid gap-3 border-b border-border py-5 pl-6 first:pt-0 sm:grid-cols-[1fr_auto]"><span className="absolute -left-[9px] top-5 grid size-4 place-items-center rounded-full bg-foreground text-[9px] text-background first:top-0">{index + 1}</span><div><p className="text-xs font-bold uppercase tracking-[.12em] text-signal">{stop.time} · {formatDuration(stop.durationMinutes)}</p><h3 className="mt-1 text-lg font-semibold">{stop.venue.name}</h3><p className="mt-1 text-sm text-muted-foreground">{stop.kind === 'dining' ? <><UtensilsCrossed className="mr-1 inline size-3.5" />{stop.venue.address}</> : stop.venue.address}</p><a href={stop.actionUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold underline decoration-signal decoration-2 underline-offset-4">{stop.actionLabel}<ExternalLink className="size-3.5" /></a></div><p className="text-sm font-semibold sm:text-right">{stop.priceLabel}</p></div>)}</div>
      <div className="mt-6 grid gap-4 border-t border-border pt-5 sm:grid-cols-[1fr_auto]"><div><p className="text-sm font-semibold">Why it works</p><ul className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">{plan.reasons.slice(0, 4).map((reason) => <li key={reason} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-[#27734d]" />{reason}</li>)}</ul>{(plan.hasUnknownActivityCost || plan.hasUnknownDiningCost) && <p className="mt-3 text-xs font-semibold text-[#9a5400]">Some venue prices must be checked; unknown prices are excluded from the known-cost total.</p>}{plan.dietaryVerificationRequired && <p className="mt-2 text-xs font-semibold text-[#9a5400]">Confirm the group’s dietary requirements directly with the venue.</p>}</div><Button onClick={onVote} disabled={busy} className={`h-12 rounded-none px-5 ${voted ? 'bg-[#27734d] text-white' : 'bg-foreground text-background'}`}>{busy ? 'Saving…' : voted ? 'Your vote' : 'Vote for this'} <Vote className="ml-2 size-4" /></Button></div><p className="mt-3 text-right text-xs text-muted-foreground">{votes} {votes === 1 ? 'vote' : 'votes'}</p>
      </div></div></article>;
}
