'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, Check, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const occasions = ['Friends catch-up', 'Birthday', 'Date', 'Family outing', 'Just because'];

function defaultDate(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

export default function Home() {
  const [name, setName] = useState('Saturday scene');
  const [occasion, setOccasion] = useState(occasions[0]);
  const [groupSize, setGroupSize] = useState(4);
  const [dates, setDates] = useState([defaultDate(6)]);

  const ready = useMemo(() => name.trim().length >= 3 && dates.length > 0, [dates, name]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b-2 border-foreground bg-background">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 lg:px-8">
          <a href="/" className="font-heading text-2xl font-bold uppercase tracking-[-0.04em]">
            Outly<span className="text-signal">.</span>
          </a>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted-foreground sm:inline">Delhi NCR pilot</span>
            <span className="border border-foreground px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em]">Private beta</span>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1280px] lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[0.82fr_1.18fr]">
        <div className="relative overflow-hidden border-b-2 border-foreground bg-foreground p-6 text-background sm:p-10 lg:border-b-0 lg:border-r-2 lg:p-14">
          <div className="city-grid absolute inset-0 opacity-20" />
          <div className="relative flex h-full min-h-[330px] flex-col justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f7a68e]">Group plans / Delhi NCR</p>
            <div className="max-w-xl py-12">
              <h1 className="font-heading text-5xl font-semibold leading-[0.95] tracking-[-0.055em] sm:text-6xl xl:text-7xl">
                Plans that work for the whole group.
              </h1>
              <p className="mt-7 max-w-md text-base leading-7 text-[#d7d5ce] sm:text-lg">
                One private link. Everyone adds their time, travel and budget. Outly finds the overlap and turns it into a day out.
              </p>
            </div>
            <div className="grid grid-cols-3 border-y border-[#4a4a48] py-4 text-sm">
              <div><strong className="block text-xl text-white">01</strong><span className="text-[#b7b6b0]">Create</span></div>
              <div><strong className="block text-xl text-white">02</strong><span className="text-[#b7b6b0]">Share</span></div>
              <div><strong className="block text-xl text-white">03</strong><span className="text-[#b7b6b0]">Choose</span></div>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-10 lg:p-14 xl:p-20">
          <div className="mx-auto max-w-xl">
            <p className="eyebrow">Start a plan</p>
            <h2 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">What are you getting together for?</h2>
            <p className="mt-3 leading-7 text-muted-foreground">Set the frame now. Your friends will add their own preferences from the link.</p>

            <form className="mt-9 space-y-7" onSubmit={(event) => event.preventDefault()}>
              <label className="field-label">
                Outing name
                <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Rhea's birthday" className="editorial-input mt-2" />
              </label>

              <fieldset>
                <legend className="field-label">Occasion</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {occasions.map((item) => (
                    <button key={item} type="button" onClick={() => setOccasion(item)} aria-pressed={occasion === item} className={`choice-chip ${occasion === item ? 'choice-chip-active' : ''}`}>
                      {occasion === item && <Check className="size-3.5" />}{item}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="field-label">
                Expected group size
                <span className="relative mt-2 block">
                  <Users className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
                  <Input type="number" min={2} max={10} value={groupSize} onChange={(event) => setGroupSize(Number(event.target.value))} className="editorial-input pl-10" />
                </span>
              </label>

              <fieldset>
                <legend className="field-label">Possible dates <span className="font-normal text-muted-foreground">(choose up to four)</span></legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {dates.map((date, index) => (
                    <span key={index} className="relative">
                      <CalendarDays className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
                      <Input type="date" value={date} min={defaultDate(1)} max={defaultDate(30)} onChange={(event) => setDates((current) => current.map((value, itemIndex) => itemIndex === index ? event.target.value : value))} className="editorial-input pl-10" />
                    </span>
                  ))}
                </div>
                {dates.length < 4 && <button type="button" onClick={() => setDates((current) => [...current, defaultDate(7 + current.length)])} className="mt-3 text-sm font-semibold underline decoration-signal decoration-2 underline-offset-4">+ Add another date</button>}
              </fieldset>

              <div className="flex items-start gap-3 border-y border-border py-4 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 size-4 shrink-0 text-signal" />
                <p>Each person adds their own starting point. Exact locations and individual budgets stay private.</p>
              </div>

              <Button type="submit" disabled={!ready} className="h-13 w-full rounded-none bg-signal text-base font-semibold text-white hover:bg-[#c93c25]">
                Create the group link <ArrowRight className="ml-2 size-4" />
              </Button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
