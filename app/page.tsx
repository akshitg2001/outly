'use client';

import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ExternalLink,
  Heart,
  IndianRupee,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  Route,
  ShieldCheck,
  Sparkles,
  Users,
  WandSparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';

type Stop = {
  time: string;
  duration: string;
  title: string;
  note: string;
  price: string;
  partner: string;
  href: string;
};

type Plan = {
  id: number;
  eyebrow: string;
  title: string;
  tag: string;
  price: number;
  match: number;
  travel: string;
  image: string;
  imageAlt: string;
  color: string;
  reason: string;
  tradeoff: string;
  stops: Stop[];
};

const plans: Plan[] = [
  {
    id: 1,
    eyebrow: 'RELAXED & PLAYFUL',
    title: 'Clay, cocktails & conversation',
    tag: 'Best overall fit',
    price: 3650,
    match: 91,
    travel: '11 min total travel',
    image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=85',
    imageAlt: 'Warmly lit social dining space',
    color: '#efe7ff',
    reason: 'Balances an easy shared activity with a low-noise dinner nearby. Both stops fit your relaxed and outdoors preferences.',
    tradeoff: 'The workshop price is fixed; dinner spend is an estimate.',
    stops: [
      { time: '6:30 PM', duration: '90 min', title: 'Beginner pottery workshop', note: 'Hands-on · beginner friendly · slots shown in demo', price: '₹1,800', partner: 'District', href: 'https://www.district.in/' },
      { time: '8:20 PM', duration: '75 min', title: 'Small plates at a neighbourhood bar', note: '800 m away · outdoor seating requested', price: '₹1,650–1,850', partner: 'Venue', href: 'https://www.google.com/maps' },
    ],
  },
  {
    id: 2,
    eyebrow: 'COSY & EASY',
    title: 'Indie film and late-night ramen',
    tag: 'Best value',
    price: 2780,
    match: 86,
    travel: '8 min total travel',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=85',
    imageAlt: 'Cinema seats in a softly lit theatre',
    color: '#e6f1ee',
    reason: 'The simplest low-friction option, with a reliable anchor booking and plenty of budget buffer for food.',
    tradeoff: 'Less interactive than your other recommendations.',
    stops: [
      { time: '6:45 PM', duration: '125 min', title: 'Independent cinema screening', note: 'Two adjacent seats · availability shown in demo', price: '₹760', partner: 'BookMyShow', href: 'https://in.bookmyshow.com/' },
      { time: '9:05 PM', duration: '70 min', title: 'Ramen and small plates', note: '600 m away · vegetarian options', price: '₹1,700–2,000', partner: 'Venue', href: 'https://www.google.com/maps' },
    ],
  },
  {
    id: 3,
    eyebrow: 'CURIOUS & LIVELY',
    title: 'Stand-up, street food & a night walk',
    tag: 'Wildcard',
    price: 3180,
    match: 82,
    travel: '16 min total travel',
    image: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=1200&q=85',
    imageAlt: 'Live comedy performance on a small stage',
    color: '#f8e8dc',
    reason: 'Adds more energy and novelty while staying inside budget and ending near a walkable dessert stop.',
    tradeoff: 'Slightly more travel and a louder environment.',
    stops: [
      { time: '7:00 PM', duration: '90 min', title: 'Live stand-up showcase', note: 'Front section · two seats · demo inventory', price: '₹1,198', partner: 'BookMyShow', href: 'https://in.bookmyshow.com/' },
      { time: '8:50 PM', duration: '70 min', title: 'Street-food tasting table', note: '1.2 km away · covered seating', price: '₹1,600–1,900', partner: 'Venue', href: 'https://www.google.com/maps' },
    ],
  },
];

const preferenceOptions = ['Good food', 'Creative', 'Outdoors', 'Live music', 'Comedy', 'Low-key'];

function PlanCard({ plan, onOpen, onBook }: { plan: Plan; onOpen: () => void; onBook: () => void }) {
  const [saved, setSaved] = useState(false);
  return (
    <article className="overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_22px_60px_rgba(38,29,22,.06)] transition-transform duration-300 hover:-translate-y-0.5">
      <div className="grid md:grid-cols-[.76fr_1.24fr]">
        <div className="relative min-h-64 overflow-hidden bg-[#d9c5af]">
          <img src={plan.image} alt={plan.imageAlt} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-[1.03]" />
          <Badge className="absolute left-4 top-4 text-[#422f24] shadow-sm" style={{ backgroundColor: plan.color }}>{plan.tag}</Badge>
          <span className="absolute bottom-4 left-4 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">{plan.match}% match</span>
        </div>
        <div className="p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[.12em] text-[#8b5b43]">PLAN {String(plan.id).padStart(2, '0')} · {plan.eyebrow}</p>
              <h3 className="mt-1.5 text-[1.65rem] font-semibold leading-tight tracking-[-0.035em]">{plan.title}</h3>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Route className="size-3.5" />{plan.travel}</span><span>Availability checked 4 min ago</span></div>
            </div>
            <div className="shrink-0 rounded-2xl bg-[#f4f0ea] px-3 py-2 text-right"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Estimated</p><p className="font-semibold">₹{plan.price.toLocaleString('en-IN')}</p></div>
          </div>

          <div className="mt-5 space-y-4 border-l border-[#d9cabb] pl-5">
            {plan.stops.map((stop) => (
              <div key={stop.title} className="relative">
                <span className="absolute -left-[25px] top-1 size-2 rounded-full border-2 border-card bg-[#9b6c53]" />
                <div className="flex justify-between gap-4"><p className="text-xs text-muted-foreground">{stop.time} · {stop.duration}</p><p className="text-xs font-medium">{stop.price}</p></div>
                <p className="font-medium">{stop.title}</p><p className="mt-0.5 text-sm text-muted-foreground">{stop.note}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Button onClick={onOpen} className="h-10 rounded-xl px-4">View plan <ArrowRight className="ml-1 size-4" /></Button>
            <Button onClick={onBook} variant="outline" className="h-10 rounded-xl px-4">Review booking</Button>
            <Button onClick={() => setSaved(!saved)} variant="ghost" size="icon-lg" aria-label={saved ? 'Remove from saved plans' : 'Save plan'} className="rounded-xl">
              <Heart className={saved ? 'fill-[#9a4f55] text-[#9a4f55]' : ''} />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const [selectedPreferences, setSelectedPreferences] = useState(['Good food', 'Creative', 'Outdoors']);
  const [showConstraints, setShowConstraints] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan>(plans[0]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<'review' | 'processing' | 'confirmed'>('review');

  const budgetRemaining = useMemo(() => 4000 - selectedPlan.price, [selectedPlan]);

  function togglePreference(value: string) {
    setSelectedPreferences((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  function generatePlans() {
    setLoading(true);
    setGenerated(false);
    window.setTimeout(() => { setLoading(false); setGenerated(true); }, 900);
  }

  function openBooking(plan: Plan) {
    setSelectedPlan(plan);
    setConsent(false);
    setBookingStatus('review');
    setBookingOpen(true);
  }

  function confirmBooking() {
    if (!consent) return;
    setBookingStatus('processing');
    window.setTimeout(() => setBookingStatus('confirmed'), 1200);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 lg:px-9">
          <a href="#planner" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_8px_24px_rgba(42,37,32,.15)]"><Sparkles className="size-4" /></span>
            <span className="text-lg">Outly</span>
            <Badge variant="outline" className="ml-1 border-[#d7c7ef] bg-[#f3edfc] text-[#6d3ec9]">Pilot</Badge>
          </a>
          <div className="flex items-center gap-3 text-sm text-muted-foreground"><span className="hidden sm:inline">Bengaluru · Demo inventory</span><Button variant="outline" className="h-9 rounded-full px-4">Saved plans</Button></div>
        </div>
      </header>

      <section id="planner" className="mx-auto grid max-w-[1440px] gap-7 px-5 py-7 lg:grid-cols-[390px_minmax(0,1fr)] lg:px-9 lg:py-9">
        <aside className="h-fit rounded-[26px] border border-border bg-card p-5 shadow-[0_24px_70px_rgba(38,29,22,.07)] lg:sticky lg:top-24">
          <Badge className="mb-4 bg-[#efe7ff] text-[#6d3ec9]">Plan in under 30 seconds</Badge>
          <h1 className="max-w-xs text-3xl font-semibold leading-[1.08] tracking-[-0.04em]">What are we stepping out for?</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Tell us the essentials. We’ll handle the sequence, budget and booking links.</p>

          <div className="mt-6 space-y-4">
            <label className="block text-sm font-medium">Occasion
              <select aria-label="Occasion" className="mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                <option>Date night</option><option>Friends catch-up</option><option>Birthday</option><option>Family day</option><option>Solo reset</option>
              </select>
            </label>
            <label className="block text-sm font-medium">City & locality
              <span className="relative mt-1.5 block"><MapPin className="absolute left-3 top-3.5 size-4 text-muted-foreground" /><Input defaultValue="Indiranagar, Bengaluru" className="h-11 rounded-xl pl-9" /></span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium">Date<span className="relative mt-1.5 block"><CalendarDays className="absolute left-3 top-3.5 size-4 text-muted-foreground" /><Input type="date" defaultValue="2026-09-05" className="h-11 rounded-xl pl-9" /></span></label>
              <label className="block text-sm font-medium">Start time<span className="relative mt-1.5 block"><Clock3 className="absolute left-3 top-3.5 size-4 text-muted-foreground" /><Input type="time" defaultValue="18:30" className="h-11 rounded-xl pl-9" /></span></label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium">Group size<span className="relative mt-1.5 block"><Users className="absolute left-3 top-3.5 size-4 text-muted-foreground" /><Input type="number" defaultValue="2" min="1" max="12" className="h-11 rounded-xl pl-9" /></span></label>
              <label className="block text-sm font-medium">Total budget<span className="relative mt-1.5 block"><IndianRupee className="absolute left-3 top-3.5 size-4 text-muted-foreground" /><Input type="number" defaultValue="4000" min="500" step="500" className="h-11 rounded-xl pl-9" /></span></label>
            </div>

            <fieldset><legend className="mb-2 text-sm font-medium">What sounds good?</legend><div className="flex flex-wrap gap-2">
              {preferenceOptions.map((item) => <button key={item} type="button" onClick={() => togglePreference(item)} aria-pressed={selectedPreferences.includes(item)} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${selectedPreferences.includes(item) ? 'border-[#9b795f] bg-[#efe4d9] text-[#583e2d]' : 'border-border bg-background text-muted-foreground hover:text-foreground'}`}>{selectedPreferences.includes(item) && <Check className="mr-1 inline size-3" />}{item}</button>)}
            </div></fieldset>

            <div className="rounded-2xl border border-border bg-background/70">
              <button type="button" onClick={() => setShowConstraints(!showConstraints)} className="flex w-full items-center justify-between p-3 text-left text-sm font-medium">Constraints <ChevronDown className={`size-4 transition ${showConstraints ? 'rotate-180' : ''}`} /></button>
              {showConstraints && <div className="space-y-3 border-t border-border p-3">
                <div className="grid grid-cols-2 gap-2"><label className="text-xs text-muted-foreground">Maximum travel<Input defaultValue="15 min" className="mt-1 h-9" /></label><label className="text-xs text-muted-foreground">End by<Input type="time" defaultValue="22:30" className="mt-1 h-9" /></label></div>
                <Textarea defaultValue="Vegetarian friendly, outdoor seating preferred" aria-label="Other constraints" className="min-h-20 resize-none" />
              </div>}
            </div>

            <Button onClick={generatePlans} disabled={loading} className="h-12 w-full rounded-xl bg-primary text-sm shadow-[0_12px_28px_rgba(72,54,41,.18)]">
              {loading ? <><LoaderCircle className="mr-1 size-4 animate-spin" /> Building feasible plans…</> : <><WandSparkles className="mr-1 size-4" /> Refresh my plans</>}
            </Button>
            <p className="text-center text-[11px] leading-4 text-muted-foreground">Demo recommendations use sample availability and estimated restaurant spend.</p>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#8b5b43]">Curated for your evening</p><h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Three ways to do Saturday night</h2></div>
            <p className="text-sm text-muted-foreground">6:30 PM · 2 people · under ₹4,000</p>
          </div>

          {loading && <div className="grid min-h-[420px] place-items-center rounded-[28px] border border-border bg-card p-8 text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#efe7ff] text-[#6d3ec9]"><Sparkles className="size-6 animate-pulse" /></span><h3 className="mt-4 text-xl font-semibold">Checking fit, timing and budget</h3><p className="mt-1 text-sm text-muted-foreground">Sequencing places close enough to enjoy—not commute between.</p><Progress value={72} className="mx-auto mt-5 w-56" /></div></div>}
          {generated && <div className="space-y-5">{plans.map((plan) => <PlanCard key={plan.id} plan={plan} onOpen={() => { setSelectedPlan(plan); setDetailOpen(true); }} onBook={() => openBooking(plan)} />)}</div>}

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[['Hard constraints first', 'Unavailable or over-budget options are removed before ranking.'], ['Reasons, not magic', 'Every plan shows why it fits and what you trade off.'], ['You confirm every booking', 'Nothing is purchased without an itemised final review.']].map(([title, copy]) => <div key={title} className="rounded-2xl border border-border bg-card/65 p-4"><ShieldCheck className="size-4 text-[#7e5b46]" /><p className="mt-2 text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{copy}</p></div>)}
          </div>
        </div>
      </section>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[24px] p-0 sm:max-w-2xl">
          <div className="relative h-48 overflow-hidden rounded-t-[24px]"><img src={selectedPlan.image} alt={selectedPlan.imageAlt} className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" /><div className="absolute bottom-5 left-5 text-white"><p className="text-xs font-semibold tracking-[.12em]">{selectedPlan.tag.toUpperCase()}</p><h2 className="mt-1 text-2xl font-semibold">{selectedPlan.title}</h2></div></div>
          <div className="px-5 pb-2 sm:px-7">
            <div className="grid gap-3 sm:grid-cols-3">{[['Fit', `${selectedPlan.match}% match`], ['Estimated total', `₹${selectedPlan.price.toLocaleString('en-IN')}`], ['Budget buffer', `₹${budgetRemaining.toLocaleString('en-IN')}`]].map(([label, value]) => <div key={label} className="rounded-xl bg-muted p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-0.5 text-sm font-semibold">{value}</p></div>)}</div>
            <div className="mt-5 rounded-2xl bg-[#f8f3ed] p-4"><p className="text-sm font-semibold">Why Outly picked this</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{selectedPlan.reason}</p><p className="mt-2 text-xs"><span className="font-semibold">Trade-off:</span> {selectedPlan.tradeoff}</p></div>
            <div className="mt-5 space-y-4"><h3 className="font-semibold">Your itinerary</h3>{selectedPlan.stops.map((stop, index) => <div key={stop.title} className="grid grid-cols-[36px_1fr_auto] gap-3"><span className="grid size-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{index + 1}</span><div><p className="text-xs text-muted-foreground">{stop.time} · {stop.duration}</p><p className="font-medium">{stop.title}</p><p className="text-sm text-muted-foreground">{stop.note}</p><a href={stop.href} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#76513e] underline underline-offset-3">Open on {stop.partner} <ExternalLink className="size-3" /></a></div><p className="text-sm font-medium">{stop.price}</p></div>)}</div>
          </div>
          <DialogFooter className="mx-0 mb-0 rounded-b-[24px] px-5 sm:px-7"><Button variant="outline" onClick={() => setDetailOpen(false)}>Keep comparing</Button><Button onClick={() => { setDetailOpen(false); openBooking(selectedPlan); }}>Review booking <ArrowRight /></Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="rounded-[24px] sm:max-w-lg">
          {bookingStatus === 'confirmed' ? <div className="py-5 text-center"><span className="mx-auto grid size-16 place-items-center rounded-full bg-[#e5f2e9] text-[#2f7650]"><CheckCircle2 className="size-8" /></span><DialogTitle className="mt-5 text-2xl">Demo booking confirmed</DialogTitle><DialogDescription className="mx-auto mt-2 max-w-sm">Both stops are marked confirmed for Saturday. No money was charged—this pilot simulates the post-payment experience.</DialogDescription><div className="mt-6 space-y-2 text-left">{selectedPlan.stops.map((stop, index) => <div key={stop.title} className="flex items-center justify-between rounded-xl border border-border p-3"><div><p className="text-sm font-medium">{stop.title}</p><p className="text-xs text-muted-foreground">OUT-{selectedPlan.id}0{index + 1} · {stop.time}</p></div><Badge className="bg-[#e5f2e9] text-[#2f7650]">Confirmed</Badge></div>)}</div><Button onClick={() => setBookingOpen(false)} className="mt-6 h-11 w-full rounded-xl">Done</Button></div> : <>
            <DialogHeader><DialogTitle className="text-xl">Review before booking</DialogTitle><DialogDescription>Outly will never purchase without your confirmation. This demo uses a simulated payment.</DialogDescription></DialogHeader>
            <div className="space-y-3 py-2">{selectedPlan.stops.map((stop) => <div key={stop.title} className="flex items-start justify-between gap-4 rounded-xl border border-border p-3"><div><p className="text-sm font-medium">{stop.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{stop.time} · 2 people · via {stop.partner}</p></div><p className="text-sm font-semibold">{stop.price}</p></div>)}</div>
            <div className="rounded-xl bg-muted p-4"><div className="flex justify-between"><span className="text-sm">Maximum authorised total</span><span className="font-semibold">₹{selectedPlan.price.toLocaleString('en-IN')}</span></div><div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>Payment method</span><span>UPI ·•• 4831 (demo)</span></div></div>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3"><Checkbox checked={consent} onCheckedChange={(value) => setConsent(value === true)} className="mt-0.5" /><span className="text-xs leading-5 text-muted-foreground">I confirm the date, time, party size and maximum total above. I understand this is a simulated pilot booking.</span></label>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground"><LockKeyhole className="size-3" /> Itemised confirmation · encrypted checkout · no blanket permission</div>
            <DialogFooter><Button variant="outline" onClick={() => setBookingOpen(false)}>Cancel</Button><Button disabled={!consent || bookingStatus === 'processing'} onClick={confirmBooking}>{bookingStatus === 'processing' ? <><LoaderCircle className="animate-spin" /> Confirming…</> : <>Confirm demo booking <ArrowRight /></>}</Button></DialogFooter>
          </>}
        </DialogContent>
      </Dialog>
    </main>
  );
}
