'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, Check, CheckCircle2, Copy, ExternalLink, MapPin, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SiteHeader } from './site-header';

const occasions = ['Friends catch-up', 'Birthday', 'Date', 'Family outing', 'Just because'];

function defaultDate(offset: number) { const date = new Date(); date.setDate(date.getDate() + offset); return date.toISOString().slice(0, 10); }
type CreatedGroup = { joinUrl: string; organizerUrl: string };

export function CreateOuting() {
  const [name, setName] = useState('Saturday scene');
  const [occasion, setOccasion] = useState(occasions[0]);
  const [groupSize, setGroupSize] = useState(4);
  const [dates, setDates] = useState([defaultDate(6)]);
  const [created, setCreated] = useState<CreatedGroup | null>(null);
  const [copied, setCopied] = useState<'join' | 'organizer' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ready = useMemo(() => name.trim().length >= 3 && dates.every(Boolean), [dates, name]);

  async function create() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, occasion, expectedSize: groupSize, candidateDates: dates }) });
      const payload = await response.json() as CreatedGroup & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Could not create the group link.');
      setCreated(payload);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create the group link.'); }
    finally { setBusy(false); }
  }

  async function copy(value: string, kind: 'join' | 'organizer') { await navigator.clipboard.writeText(value); setCopied(kind); window.setTimeout(() => setCopied(null), 1800); }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <section className="mx-auto grid max-w-[1280px] lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[0.82fr_1.18fr]">
        <div className="relative overflow-hidden border-b-2 border-foreground bg-foreground p-6 text-background sm:p-10 lg:border-b-0 lg:border-r-2 lg:p-14">
          <div className="city-grid absolute inset-0 opacity-20" />
          <div className="relative flex h-full min-h-[330px] flex-col justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f7a68e]">Group plans / Delhi NCR</p>
            <div className="max-w-xl py-12"><h1 className="font-heading text-5xl font-semibold leading-[0.95] tracking-[-0.055em] sm:text-6xl xl:text-7xl">Plans that work for the whole group.</h1><p className="mt-7 max-w-md text-base leading-7 text-[#d7d5ce] sm:text-lg">One private link. Everyone adds their time, travel and budget. Outly finds the overlap and turns it into a day out.</p></div>
            <div className="grid grid-cols-3 border-y border-[#4a4a48] py-4 text-sm"><div><strong className="block text-xl text-white">01</strong><span className="text-[#b7b6b0]">Create</span></div><div><strong className="block text-xl text-white">02</strong><span className="text-[#b7b6b0]">Share</span></div><div><strong className="block text-xl text-white">03</strong><span className="text-[#b7b6b0]">Choose</span></div></div>
          </div>
        </div>
        <div className="p-5 sm:p-10 lg:p-14 xl:p-20"><div className="mx-auto max-w-xl">{created ? (
          <div className="py-4"><span className="grid size-12 place-items-center bg-[#27734d] text-white"><CheckCircle2 className="size-6" /></span><p className="eyebrow mt-7">Your group is open</p><h2 className="mt-3 font-heading text-4xl font-semibold tracking-[-0.04em]">Share one link. Keep one private.</h2><p className="mt-3 leading-7 text-muted-foreground">Send the participant link to everyone. Save the organizer link for reviewing the overlap and generating plans.</p><div className="mt-8 space-y-4"><LinkBox label="Participant link" note="Share this in the group chat" value={created.joinUrl} copied={copied === 'join'} onCopy={() => copy(created.joinUrl, 'join')} /><LinkBox label="Organizer link" note="Private — anyone with this link can lock the group" value={created.organizerUrl} copied={copied === 'organizer'} onCopy={() => copy(created.organizerUrl, 'organizer')} /></div><a href={created.organizerUrl} className="mt-7 inline-flex h-13 w-full items-center justify-center bg-signal px-5 font-semibold text-white hover:bg-[#c93c25]">Open organizer view <ArrowRight className="ml-2 size-4" /></a><button onClick={() => { setCreated(null); setError(''); }} className="mt-4 w-full py-2 text-sm font-semibold underline decoration-2 underline-offset-4">Create another outing</button></div>
        ) : (
          <><p className="eyebrow">Start a plan</p><h2 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">What are you getting together for?</h2><p className="mt-3 leading-7 text-muted-foreground">Set the frame now. Your friends will add their own preferences from the link.</p>
          <form className="mt-9 space-y-7" onSubmit={(event) => { event.preventDefault(); void create(); }}><label className="field-label">Outing name<Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Rhea's birthday" className="editorial-input mt-2" /></label><fieldset><legend className="field-label">Occasion</legend><div className="mt-2 flex flex-wrap gap-2">{occasions.map((item) => <button key={item} type="button" onClick={() => setOccasion(item)} aria-pressed={occasion === item} className={`choice-chip ${occasion === item ? 'choice-chip-active' : ''}`}>{occasion === item && <Check className="size-3.5" />}{item}</button>)}</div></fieldset><label className="field-label">Expected group size<span className="relative mt-2 block"><Users className="absolute left-3 top-3.5 size-4 text-muted-foreground" /><Input type="number" min={2} max={10} value={groupSize} onChange={(event) => setGroupSize(Number(event.target.value))} className="editorial-input pl-10" /></span></label>
          <fieldset><legend className="field-label">Possible dates <span className="font-normal text-muted-foreground">(choose up to four)</span></legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{dates.map((date, index) => <span key={index} className="relative"><CalendarDays className="absolute left-3 top-3.5 size-4 text-muted-foreground" /><Input type="date" value={date} min={defaultDate(1)} max={defaultDate(30)} onChange={(event) => setDates((current) => current.map((value, itemIndex) => itemIndex === index ? event.target.value : value))} className="editorial-input pl-10 pr-9" />{dates.length > 1 && <button type="button" onClick={() => setDates((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Remove date" className="absolute right-2 top-2.5 grid size-7 place-items-center bg-card"><Trash2 className="size-3.5" /></button>}</span>)}</div>{dates.length < 4 && <button type="button" onClick={() => setDates((current) => [...current, defaultDate(7 + current.length)])} className="mt-3 text-sm font-semibold underline decoration-signal decoration-2 underline-offset-4">+ Add another date</button>}</fieldset>
          <div className="flex items-start gap-3 border-y border-border py-4 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0 text-signal" /><p>Each person adds their own starting point. Exact locations and individual budgets stay private.</p></div>{error && <p role="alert" className="border-l-4 border-destructive bg-[#fbe9e7] px-4 py-3 text-sm text-destructive">{error}</p>}<Button type="submit" disabled={!ready || busy} className="h-13 w-full rounded-none bg-signal text-base font-semibold text-white hover:bg-[#c93c25]">{busy ? 'Creating the link…' : 'Create the group link'} {!busy && <ArrowRight className="ml-2 size-4" />}</Button></form></>
        )}</div></div>
      </section>
    </main>
  );
}

function LinkBox({ label, note, value, copied, onCopy }: { label: string; note: string; value: string; copied: boolean; onCopy: () => void }) {
  return <div className="border border-foreground bg-card p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{label}</p><p className="mt-0.5 text-xs text-muted-foreground">{note}</p></div><a href={value} target="_blank" rel="noreferrer" aria-label={`Open ${label}`} className="grid size-9 place-items-center border border-border hover:border-foreground"><ExternalLink className="size-4" /></a></div><p className="mt-4 truncate border-y border-border py-2 font-mono text-xs">{value}</p><button onClick={onCopy} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold"><Copy className="size-4" />{copied ? 'Copied' : 'Copy link'}</button></div>;
}
