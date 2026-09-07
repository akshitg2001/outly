'use client';

import { useState } from 'react';
import { AlertTriangle, ArrowRight, CalendarDays, Check, CheckCircle2, Clock3, Copy, IndianRupee, Lock, MapPin, RefreshCw, Route, Unlock, Users, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ACTIVITY_LABELS, TIME_WINDOW_LABELS } from '@/lib/outly-types';
import { formatDate, formatDuration } from '@/lib/recommendation';
import { ErrorPanel, LoadingPanel, SiteHeader } from './site-header';
import { useGroup } from './use-group';

export function OrganizerDashboard({ token, joinToken }: { token: string; joinToken?: string }) {
  const { view, loading, error, refresh } = useGroup(token);
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  const [copied, setCopied] = useState(false);

  async function action(name: string) {
    setBusy(name); setActionError('');
    try {
      const response = await fetch(`/api/groups/${encodeURIComponent(token)}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: name }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Could not complete that action.');
      await refresh();
      if (name === 'generate_plans') window.location.href = `/plan/${encodeURIComponent(token)}/results`;
    } catch (reason) { setActionError(reason instanceof Error ? reason.message : 'Could not complete that action.'); await refresh(); }
    finally { setBusy(''); }
  }

  async function copyJoinLink() {
    if (!joinToken) return;
    await navigator.clipboard.writeText(`${window.location.origin}/plan/${joinToken}`);
    setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  }

  if (loading) return <main className="min-h-screen"><SiteHeader /><LoadingPanel label="Building the group view…" /></main>;
  if (error || !view) return <main className="min-h-screen"><SiteHeader /><ErrorPanel message={error || 'This organizer link is unavailable.'} retry={() => refresh()} /></main>;
  if (view.role !== 'organizer') return <main className="min-h-screen"><SiteHeader /><ErrorPanel message="This is a participant link. Open the private organizer link created with the outing." /></main>;
  const agreement = view.agreement;
  const responded = view.submittedCount;
  const missing = Math.max(0, view.expectedSize - responded);
  const canLock = responded >= 2 && !agreement?.conflict;
  const pending = view.pendingRelaxation?.status === 'pending' ? view.pendingRelaxation : null;
  const affectedNames = pending?.affectedParticipantIds.map((id) => view.participantSummaries.find((participant) => participant.id === id)?.displayName ?? 'A participant') ?? [];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader context="Organizer view" />
      <div className="mx-auto max-w-[1240px] px-5 py-8 lg:px-8 lg:py-12">
        <div className="flex flex-col justify-between gap-6 border-b-2 border-foreground pb-7 sm:flex-row sm:items-end"><div><p className="eyebrow">{view.group.occasion} / organizer</p><h1 className="mt-2 font-heading text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">{view.group.name}</h1><p className="mt-3 text-muted-foreground">Watch the responses, resolve any mismatch, then lock the shared brief.</p></div><div className="flex flex-wrap gap-2">{joinToken && <Button variant="outline" onClick={copyJoinLink} className="h-11 rounded-none border-foreground"><Copy />{copied ? 'Copied' : 'Copy participant link'}</Button>}<button onClick={() => refresh()} aria-label="Refresh group" className="grid size-11 place-items-center border border-foreground"><RefreshCw className="size-4" /></button></div></div>

        <div className="mt-7 grid gap-6 lg:grid-cols-[0.65fr_1.35fr]">
          <aside className="space-y-5"><div className="border-2 border-foreground bg-foreground p-6 text-background"><div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#f7a68e]">Responses</p><strong className="mt-1 block text-4xl">{responded}/{view.expectedSize}</strong></div><Users className="size-7 text-[#f7a68e]" /></div><div className="mt-5 h-2 bg-[#4b4b48]"><div className="h-full bg-signal" style={{ width: `${Math.min(100, responded / view.expectedSize * 100)}%` }} /></div><div className="mt-5 space-y-2">{view.participantNames.map((name) => <div key={name} className="flex items-center justify-between border-t border-[#4b4b48] pt-2 text-sm"><span>{name}</span><CheckCircle2 className="size-4 text-[#88c9a5]" /></div>)}{Array.from({ length: missing }).map((_, index) => <div key={index} className="flex items-center justify-between border-t border-[#4b4b48] pt-2 text-sm text-[#999890]"><span>Waiting for response</span><Clock3 className="size-4" /></div>)}</div></div>
          <div className="border border-foreground bg-card p-5"><p className="text-sm font-semibold">Private by design</p><p className="mt-2 text-sm leading-6 text-muted-foreground">This view reports group-level constraints. It never lists a person’s exact origin or individual budget.</p></div></aside>

          <section>
            {pending && <div className="mb-6 border-2 border-signal bg-[#f9ded6] p-5"><p className="eyebrow">Change proposed</p><h2 className="mt-2 font-heading text-2xl font-semibold">Waiting for {affectedNames.join(', ')}</h2><p className="mt-2 leading-6">{pending.description}</p><p className="mt-3 text-sm font-semibold">{pending.approvals.length}/{pending.affectedParticipantIds.length} approvals</p></div>}
            {agreement?.conflict ? <div className="border-2 border-[#b26a00] bg-[#fff1cf] p-6"><AlertTriangle className="size-7" /><p className="eyebrow mt-5 text-[#8a4c00]">No clean overlap yet</p><h2 className="mt-2 font-heading text-3xl font-semibold">{agreement.conflict.title}</h2><p className="mt-3 max-w-2xl leading-7">{agreement.conflict.description}</p>{agreement.conflict.kind !== 'responses' && !pending && <Button onClick={() => action('propose_relaxation')} disabled={Boolean(busy)} className="mt-5 rounded-none bg-foreground text-background">{busy === 'propose_relaxation' ? 'Sending…' : 'Ask the affected people'} <ArrowRight /></Button>}</div> : agreement ? <><div className="border-2 border-foreground bg-card"><div className="border-b-2 border-foreground p-5 sm:p-6"><p className="eyebrow">The shared brief</p><div className="mt-2 flex items-start justify-between gap-4"><h2 className="font-heading text-3xl font-semibold">What works for everyone</h2>{view.group.status !== 'collecting' && <span className="flex items-center gap-1.5 bg-[#27734d] px-2.5 py-1 text-xs font-bold uppercase tracking-[.12em] text-white"><Lock className="size-3" />Locked</span>}</div></div><div className="grid sm:grid-cols-2"><AgreementItem icon={<CalendarDays />} label="Date & time" value={`${agreement.selectedDate ? formatDate(agreement.selectedDate) : 'No shared date'} · ${agreement.selectedTimeWindow ? TIME_WINDOW_LABELS[agreement.selectedTimeWindow] : 'No shared time'}`} /><AgreementItem icon={<IndianRupee />} label="Budget" value={`Target ₹${agreement.budgetTarget.toLocaleString('en-IN')} · hard stop ₹${agreement.budgetHardMax.toLocaleString('en-IN')}`} /><AgreementItem icon={<Route />} label="Duration" value={`${formatDuration(agreement.durationMin)}–${formatDuration(agreement.durationMax)}`} /><AgreementItem icon={<UtensilsCrossed />} label="Food" value={agreement.foodPreference === 'meal' ? 'Proper meal' : 'Snacks & drinks'} /><AgreementItem icon={<MapPin />} label="Top activities" value={agreement.rankedActivities.slice(0, 2).map((item) => `${ACTIVITY_LABELS[item.category]} (${item.votes})`).join(' · ')} /><AgreementItem icon={<Check />} label="Dietary" value={agreement.dietary.length ? agreement.dietary.map((item) => item.replaceAll('_', ' ')).join(', ') : 'No shared requirement'} /></div></div>
              {missing > 0 && view.group.status === 'collecting' && <div className="mt-4 flex gap-3 border border-[#b26a00] bg-[#fff1cf] p-4 text-sm"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><p>{missing} expected {missing === 1 ? 'person has' : 'people have'} not responded. You can lock now, but their preferences will not be represented.</p></div>}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">{view.group.status === 'collecting' ? <Button onClick={() => action('lock')} disabled={!canLock || Boolean(busy)} className="h-12 flex-1 rounded-none bg-signal text-white hover:bg-[#c93c25]">{busy === 'lock' ? 'Locking…' : 'Lock the group agreement'} <Lock /></Button> : <><Button onClick={() => action('generate_plans')} disabled={Boolean(busy)} className="h-12 flex-1 rounded-none bg-signal text-white hover:bg-[#c93c25]">{busy === 'generate_plans' ? 'Checking Delhi options…' : view.group.status === 'planned' ? 'Regenerate plans' : 'Generate three plans'} <ArrowRight /></Button><Button variant="outline" onClick={() => action('unlock')} disabled={Boolean(busy)} className="h-12 rounded-none border-foreground"><Unlock />Unlock answers</Button>{view.group.status === 'planned' && <a href={`/plan/${token}/results`} className="inline-flex h-12 items-center justify-center border border-foreground px-5 font-semibold">View plans</a>}</>}</div>
            </> : null}
            {actionError && <p role="alert" className="mt-5 border-l-4 border-destructive bg-[#fbe9e7] px-4 py-3 text-sm text-destructive">{actionError}</p>}
          </section>
        </div>
      </div>
    </main>
  );
}

function AgreementItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="border-b border-foreground/30 p-5 last:border-b-0 sm:border-r sm:p-6 sm:[&:nth-last-child(-n+2)]:border-b-0 sm:[&:nth-child(2n)]:border-r-0"><span className="[&>svg]:size-4 [&>svg]:text-signal">{icon}</span><p className="mt-3 text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold leading-6">{value}</p></div>; }
