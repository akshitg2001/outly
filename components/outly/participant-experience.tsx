'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Bus, Car, Check, CheckCircle2, IndianRupee, Lock, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { ACTIVITY_LABELS, DURATION_BANDS, TIME_WINDOW_LABELS, type ActivityCategory, type DurationBand, type FoodPreference, type TimeWindow, type TravelMode } from '@/lib/outly-types';
import { formatDate, roundBudgetHardMax } from '@/lib/recommendation';
import type { ParticipantRecord } from '@/lib/outly-types';
import { LocationCombobox } from './location-combobox';
import { ErrorPanel, LoadingPanel, SiteHeader } from './site-header';
import { ResultsBoard } from './results-board';
import { useGroup } from './use-group';

const categories: ActivityCategory[] = ['games', 'sports', 'arts', 'nightlife', 'anything'];
const windows: TimeWindow[] = ['morning', 'lunch', 'afternoon', 'evening', 'late'];
const durations: Array<{ id: DurationBand; label: string; note: string }> = [
  { id: 'quick', label: 'Quick', note: '1.5–3h' }, { id: 'standard', label: 'Standard', note: '3–5h' }, { id: 'extended', label: 'Extended', note: '5–7h' }, { id: 'flexible', label: 'Flexible', note: 'Any length' },
];

export function ParticipantExperience({ token }: { token: string }) {
  const { view, loading, error, refresh } = useGroup(token);
  const [displayName, setDisplayName] = useState('');
  const [origin, setOrigin] = useState({ label: '', placeId: null as string | null });
  const [travelMode, setTravelMode] = useState<TravelMode>('drive');
  const [travelMax, setTravelMax] = useState(35);
  const [budget, setBudget] = useState(2000);
  const [dates, setDates] = useState<string[]>([]);
  const [timeWindows, setTimeWindows] = useState<TimeWindow[]>(['evening']);
  const [activities, setActivities] = useState<ActivityCategory[]>(['anything']);
  const [food, setFood] = useState<FoodPreference>('meal');
  const [dietary, setDietary] = useState<string[]>([]);
  const [otherDietary, setOtherDietary] = useState('');
  const [duration, setDuration] = useState<DurationBand>('standard');
  const [submitted, setSubmitted] = useState(false);
  const [editing, setEditing] = useState(true);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const initializedGroup = useRef<string | null>(null);

  useEffect(() => {
    if (!view || initializedGroup.current === view.group.id) return;
    initializedGroup.current = view.group.id;
    setDates(view.group.candidateDates);
    const storedId = window.localStorage.getItem(`outly_participant_id_${view.group.id}`);
    const storedToken = window.localStorage.getItem(`outly_edit_token_${view.group.id}`);
    if (storedId && storedToken) { setParticipantId(storedId); setSubmitted(true); setEditing(false); }
  }, [view]);

  const complete = useMemo(() => displayName.trim().length >= 2 && Boolean(origin.placeId) && dates.length > 0 && timeWindows.length > 0 && activities.length > 0, [activities, dates, displayName, origin.placeId, timeWindows]);
  const toggle = <T,>(current: T[], value: T, set: (next: T[]) => void) => set(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);

  async function submit() {
    if (!view) return;
    setBusy(true); setFormError('');
    try {
      let editToken = window.localStorage.getItem(`outly_edit_token_${view.group.id}`);
      if (!editToken) {
        editToken = Array.from(crypto.getRandomValues(new Uint8Array(24)), (byte) => byte.toString(16).padStart(2, '0')).join('');
        window.localStorage.setItem(`outly_edit_token_${view.group.id}`, editToken);
      }
      const requirements = [...dietary, ...(otherDietary.trim() ? [otherDietary.trim()] : [])];
      const response = await fetch(`/api/groups/${encodeURIComponent(token)}/participants`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName, originLabel: origin.label, originPlaceId: origin.placeId, travelMode, travelMaxMinutes: travelMax, budgetTarget: budget, acceptableDates: dates, timeWindows, activities, foodPreference: food, dietary: requirements, durationBand: duration, editToken }),
      });
      const payload = await response.json() as { participantId?: string; editToken?: string; error?: string };
      if (!response.ok || !payload.participantId || !payload.editToken) throw new Error(payload.error ?? 'Could not save your response.');
      window.localStorage.setItem(`outly_participant_id_${view.group.id}`, payload.participantId);
      window.localStorage.setItem(`outly_edit_token_${view.group.id}`, payload.editToken);
      setParticipantId(payload.participantId); setSubmitted(true); setEditing(false); await refresh();
    } catch (reason) { setFormError(reason instanceof Error ? reason.message : 'Could not save your response.'); }
    finally { setBusy(false); }
  }

  async function approve() {
    if (!view) return;
    const editToken = window.localStorage.getItem(`outly_edit_token_${view.group.id}`);
    if (!editToken) { setFormError('Open this plan on the device you used to respond.'); return; }
    setBusy(true);
    try {
      const response = await fetch(`/api/groups/${encodeURIComponent(token)}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve_relaxation', editToken }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Could not approve the change.');
      await refresh();
    } catch (reason) { setFormError(reason instanceof Error ? reason.message : 'Could not approve the change.'); }
    finally { setBusy(false); }
  }

  async function editSaved() {
    if (!view) return;
    setBusy(true); setFormError('');
    try {
      const privateKey = window.localStorage.getItem(`outly_edit_token_${view.group.id}`) ?? '';
      const response = await fetch(`/api/groups/${encodeURIComponent(token)}/participants`, { method: 'POST', headers: { 'X-Outly-Edit-Token': privateKey } });
      const payload = await response.json() as { participant?: ParticipantRecord; error?: string };
      if (!response.ok || !payload.participant) throw new Error(payload.error ?? 'Could not load your saved response.');
      const saved = payload.participant;
      setDisplayName(saved.displayName); setOrigin({ label: saved.originLabel, placeId: saved.originPlaceId ?? null });
      setTravelMode(saved.travelMode); setTravelMax(saved.travelMaxMinutes); setBudget(saved.budgetTarget);
      setDates(saved.acceptableDates); setTimeWindows(saved.timeWindows); setActivities(saved.activities);
      setFood(saved.foodPreference); setDuration(saved.durationBand);
      setDietary(saved.dietary.filter((item) => ['vegetarian', 'pure_veg', 'no_alcohol'].includes(item)));
      setOtherDietary(saved.dietary.filter((item) => !['vegetarian', 'pure_veg', 'no_alcohol'].includes(item)).join(', '));
      setEditing(true);
    } catch (reason) { setFormError(reason instanceof Error ? reason.message : 'Could not load your response.'); }
    finally { setBusy(false); }
  }

  if (loading) return <main className="min-h-screen"><SiteHeader /><LoadingPanel /></main>;
  if (error || !view) return <main className="min-h-screen"><SiteHeader /><ErrorPanel message={error || 'This private plan link is unavailable.'} retry={() => refresh()} /></main>;
  if (view.group.status === 'planned') return <ResultsBoard token={token} initialView={view} />;

  const affected = participantId && view.pendingRelaxation?.status === 'pending' && view.pendingRelaxation.affectedParticipantIds.includes(participantId) && !view.pendingRelaxation.approvals.includes(participantId);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader context={`${view.group.name} · group plan`} />
      <div className="mx-auto max-w-[1120px] px-5 py-8 lg:px-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[0.68fr_1.32fr]">
          <aside className="h-fit border-2 border-foreground bg-foreground p-6 text-background lg:sticky lg:top-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f7a68e]">{view.group.occasion}</p>
            <h1 className="mt-3 font-heading text-4xl font-semibold tracking-[-0.04em]">{view.group.name}</h1>
            <div className="mt-7 border-y border-[#494947] py-4"><div className="flex items-end justify-between"><span className="text-sm text-[#b8b7b1]">Responses</span><strong className="text-2xl">{view.submittedCount}/{view.expectedSize}</strong></div><div className="mt-3 h-2 bg-[#494947]"><div className="h-full bg-signal transition-all" style={{ width: `${Math.min(100, view.submittedCount / view.expectedSize * 100)}%` }} /></div></div>
            <div className="mt-5 flex flex-wrap gap-2">{view.participantNames.map((name) => <span key={name} className="border border-[#5e5d59] px-2.5 py-1 text-xs">{name}</span>)}{Array.from({ length: Math.max(0, view.expectedSize - view.submittedCount) }).map((_, index) => <span key={index} className="border border-dashed border-[#5e5d59] px-2.5 py-1 text-xs text-[#96958f]">Waiting</span>)}</div>
            <div className="mt-8 flex gap-3 text-sm text-[#c9c7bf]"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#f7a68e]" /><p>Your exact location and budget remain private. Origin details are removed 30 days after the last proposed date.</p></div>
          </aside>

          <section>
            {affected && <div className="mb-6 border-2 border-signal bg-[#f9ded6] p-5"><p className="eyebrow">Your answer can unlock the plan</p><h2 className="mt-2 font-heading text-2xl font-semibold">A small change was proposed</h2><p className="mt-2 text-sm leading-6">{view.pendingRelaxation?.description}</p><Button onClick={approve} disabled={busy} className="mt-4 rounded-none bg-signal text-white hover:bg-[#c93c25]">{busy ? 'Saving…' : 'Accept this change'} <ArrowRight /></Button></div>}
            {submitted && !editing ? (
              <div className="border-2 border-foreground bg-card p-6 sm:p-9"><CheckCircle2 className="size-10 text-[#27734d]" /><p className="eyebrow mt-6">Response saved</p><h2 className="mt-2 font-heading text-4xl font-semibold tracking-[-0.04em]">You’re in the mix.</h2><p className="mt-3 max-w-lg leading-7 text-muted-foreground">Outly will combine your limits with everyone else’s. This page updates automatically when the organizer locks the agreement or publishes plans.</p><div className="mt-7 border-y border-border py-4"><p className="text-sm font-semibold">{view.submittedCount} of {view.expectedSize} people have responded</p><p className="mt-1 text-sm text-muted-foreground">You can still edit until the organizer locks the group.</p></div>{view.group.status === 'collecting' ? <button onClick={editSaved} disabled={busy} className="mt-6 border border-foreground px-5 py-3 text-sm font-semibold hover:bg-foreground hover:text-background">Edit my preferences</button> : <div className="mt-6 flex items-center gap-2 text-sm font-semibold"><Lock className="size-4" />Agreement locked — plans are being prepared</div>}{formError && <p className="mt-4 text-sm text-destructive">{formError}</p>}</div>
            ) : (
              <form onSubmit={(event) => { event.preventDefault(); void submit(); }}>
                <p className="eyebrow">Your preferences</p><h2 className="mt-2 font-heading text-4xl font-semibold tracking-[-0.04em]">What works for you?</h2><p className="mt-3 text-muted-foreground">There are no wrong answers. The organizer sees the overlap, not your private details.</p>
                <FormSection number="01" title="You and your starting point"><label className="field-label">Name or nickname<Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="What should the group see?" className="editorial-input mt-2" /></label><label className="field-label mt-5">Starting location<LocationCombobox value={origin.label} placeId={origin.placeId} onChange={setOrigin} /></label><fieldset className="mt-5"><legend className="field-label">How will you travel?</legend><RadioGroup value={travelMode} onValueChange={(value) => setTravelMode(value as TravelMode)} className="mt-2 grid grid-cols-2 gap-2"><RadioChoice value="drive" label="Cab / drive" icon={<Car className="size-4" />} /><RadioChoice value="transit" label="Public transport" icon={<Bus className="size-4" />} /></RadioGroup></fieldset><label className="field-label mt-5">Maximum one-way travel: <strong>{travelMax} min</strong><Slider min={15} max={90} step={5} value={[travelMax]} onValueChange={(value) => setTravelMax(typeof value === 'number' ? value : value[0])} className="mt-4" /></label></FormSection>
                <FormSection number="02" title="Time and spend"><fieldset><legend className="field-label">Dates you can make</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{view.group.candidateDates.map((date) => <CheckChoice key={date} checked={dates.includes(date)} label={formatDate(date)} onChange={() => toggle(dates, date, setDates)} />)}</div></fieldset><fieldset className="mt-5"><legend className="field-label">Time windows</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{windows.map((window) => <CheckChoice key={window} checked={timeWindows.includes(window)} label={TIME_WINDOW_LABELS[window]} onChange={() => toggle(timeWindows, window, setTimeWindows)} />)}</div></fieldset><label className="field-label mt-6">Maximum spend per person<div className="relative mt-2"><IndianRupee className="absolute left-3 top-3.5 size-4 text-muted-foreground" /><Input type="number" min={300} max={20000} step={100} value={budget} onChange={(event) => setBudget(Number(event.target.value))} className="editorial-input pl-10" /></div><span className="mt-2 block text-xs font-normal text-muted-foreground">Outly targets ₹{budget.toLocaleString('en-IN')} and never exceeds ₹{roundBudgetHardMax(budget)} in known costs.</span></label></FormSection>
                <FormSection number="03" title="The kind of plan"><fieldset><legend className="field-label">Activities that sound good</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{categories.map((category) => <CheckChoice key={category} checked={activities.includes(category)} label={ACTIVITY_LABELS[category]} onChange={() => category === 'anything' ? setActivities(['anything']) : toggle(activities.filter((item) => item !== 'anything'), category, setActivities)} />)}</div></fieldset><fieldset className="mt-6"><legend className="field-label">Food</legend><RadioGroup value={food} onValueChange={(value) => setFood(value as FoodPreference)} className="mt-2 grid grid-cols-2 gap-2"><RadioChoice value="meal" label="Proper meal" /><RadioChoice value="snacks" label="Snacks & drinks" /></RadioGroup></fieldset><fieldset className="mt-6"><legend className="field-label">Total duration</legend><RadioGroup value={duration} onValueChange={(value) => setDuration(value as DurationBand)} className="mt-2 grid grid-cols-2 gap-2">{durations.map((item) => <RadioChoice key={item.id} value={item.id} label={item.label} note={item.note} />)}</RadioGroup></fieldset></FormSection>
                <FormSection number="04" title="Dietary needs"><div className="grid gap-2 sm:grid-cols-2">{[['vegetarian', 'Vegetarian options'], ['pure_veg', 'Pure veg venue'], ['no_alcohol', 'No-alcohol venue']].map(([value, label]) => <CheckChoice key={value} checked={dietary.includes(value)} label={label} onChange={() => toggle(dietary, value, setDietary)} />)}</div><label className="field-label mt-5">Allergy or other requirement <span className="font-normal text-muted-foreground">(optional)</span><Input value={otherDietary} onChange={(event) => setOtherDietary(event.target.value)} placeholder="e.g. severe nut allergy" className="editorial-input mt-2" /><span className="mt-2 block text-xs font-normal text-muted-foreground">Dining must have recorded confirmation of every requirement. Strict requirements may leave no matching options.</span></label></FormSection>
                {formError && <p role="alert" className="mb-5 border-l-4 border-destructive bg-[#fbe9e7] px-4 py-3 text-sm text-destructive">{formError}</p>}<Button type="submit" disabled={!complete || busy} className="h-13 w-full rounded-none bg-signal text-base font-semibold text-white hover:bg-[#c93c25]">{busy ? 'Saving your response…' : submitted ? 'Update my preferences' : 'Add me to the plan'} {!busy && <ArrowRight />}</Button>
              </form>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function FormSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) { return <section className="my-8 border-t-2 border-foreground pt-5"><div className="mb-6 flex items-baseline gap-3"><span className="font-mono text-xs text-signal">{number}</span><h3 className="font-heading text-2xl font-semibold">{title}</h3></div>{children}</section>; }
function CheckChoice({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) { return <label className={`flex min-h-12 cursor-pointer items-center gap-3 border p-3 text-sm font-medium ${checked ? 'border-foreground bg-foreground text-background' : 'border-foreground/40 bg-card'}`}><Checkbox checked={checked} onCheckedChange={onChange} className={checked ? 'border-background data-[state=checked]:bg-background data-[state=checked]:text-foreground' : ''} />{label}</label>; }
function RadioChoice({ value, label, note, icon }: { value: string; label: string; note?: string; icon?: React.ReactNode }) { return <label className="flex min-h-12 cursor-pointer items-center gap-3 border border-foreground/40 bg-card p-3 text-sm"><RadioGroupItem value={value} />{icon}<span><strong className="font-medium">{label}</strong>{note && <small className="block text-xs text-muted-foreground">{note}</small>}</span></label>; }
