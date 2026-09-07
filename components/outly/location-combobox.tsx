'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

type Suggestion = { placeId: string; label: string; lat?: number | null; lng?: number | null };

export function LocationCombobox({ value, placeId, onChange }: { value: string; placeId: string | null; onChange: (value: { label: string; placeId: string | null }) => void }) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const selectedLabel = useRef(value);

  useEffect(() => {
    if (value.trim().length < 2 || value === selectedLabel.current) { setSuggestions([]); return; }
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(value)}`, { signal: controller.signal });
        const payload = await response.json() as { suggestions?: Suggestion[] };
        setSuggestions(payload.suggestions ?? []);
        setOpen(true);
      } catch {
        if (!controller.signal.aborted) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 280);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [value]);

  return (
    <div className="relative mt-2">
      <MapPin className="absolute left-3 top-3.5 z-10 size-4 text-signal" />
      <Input value={value} onChange={(event) => { selectedLabel.current = ''; onChange({ label: event.target.value, placeId: null }); }} onFocus={() => suggestions.length && setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 150)} autoComplete="off" placeholder="Search your neighbourhood" className="editorial-input pl-10 pr-10" aria-autocomplete="list" aria-expanded={open} />
      <Search className={`absolute right-3 top-3.5 size-4 text-muted-foreground ${searching ? 'animate-pulse' : ''}`} />
      {open && suggestions.length > 0 && <div role="listbox" className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto border border-foreground bg-card shadow-[6px_6px_0_#111]">{suggestions.map((suggestion) => <button key={suggestion.placeId} type="button" role="option" aria-selected={placeId === suggestion.placeId} onMouseDown={(event) => event.preventDefault()} onClick={() => { selectedLabel.current = suggestion.label; onChange({ label: suggestion.label, placeId: suggestion.placeId }); setOpen(false); }} className="block w-full border-b border-border px-4 py-3 text-left text-sm last:border-b-0 hover:bg-muted">{suggestion.label}</button>)}</div>}
    </div>
  );
}
