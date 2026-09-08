'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

type Suggestion = { placeId: string; label: string; lat?: number | null; lng?: number | null };

export function LocationCombobox({ value, placeId, onChange }: { value: string; placeId: string | null; onChange: (value: { label: string; placeId: string | null }) => void }) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');
  const [dataMode, setDataMode] = useState<'preview' | 'live' | null>(null);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const selectedLabel = useRef(value);

  useEffect(() => {
    if (value.trim().length < 2 || placeId) { setSuggestions([]); setSearching(false); setMessage(''); return; }
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearching(true); setMessage(''); setActive(-1);
      try {
        const response = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(value)}`, { signal: controller.signal });
        const payload = await response.json() as { suggestions?: Suggestion[]; dataMode?: 'live' | 'preview'; error?: string };
        if (!response.ok) throw new Error(payload.error ?? 'Location search is unavailable. Please try again.');
        setDataMode(payload.dataMode ?? null);
        setSuggestions(payload.suggestions ?? []);
        if (!payload.suggestions?.length) setMessage(payload.dataMode === 'preview' ? 'This neighbourhood is not in the preview yet. Try Rajouri Garden, Connaught Place, Hauz Khas, Saket, Dwarka, Rohini, Noida Sector 18 or Cyber Hub.' : 'No matching location found. Try a nearby neighbourhood or landmark.');
        setOpen(true);
      } catch (error) {
        if (!controller.signal.aborted) { setSuggestions([]); setMessage(error instanceof Error ? error.message : 'Location search is unavailable. Please try again.'); }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 280);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [value, placeId]);

  function choose(suggestion: Suggestion) {
    selectedLabel.current = suggestion.label; onChange({ label: suggestion.label, placeId: suggestion.placeId }); setOpen(false); setMessage('');
  }

  return (
    <div className="relative mt-2">
      <MapPin className="absolute left-3 top-3.5 z-10 size-4 text-signal" />
      <Input value={value} onChange={(event) => { selectedLabel.current = ''; onChange({ label: event.target.value, placeId: null }); }} onFocus={() => suggestions.length && setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 150)} onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false);
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); setActive((current) => Math.max(0, Math.min(suggestions.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1)))); }
        if (event.key === 'Enter' && open && active >= 0 && suggestions[active]) { event.preventDefault(); choose(suggestions[active]); }
      }} autoComplete="off" placeholder="Search your neighbourhood" className="editorial-input pl-10 pr-10" role="combobox" aria-autocomplete="list" aria-controls={listId} aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined} aria-expanded={open && suggestions.length > 0} />
      <Search className={`absolute right-3 top-3.5 size-4 text-muted-foreground ${searching ? 'animate-pulse' : ''}`} />
      {open && suggestions.length > 0 && <div id={listId} role="listbox" className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto border border-foreground bg-card shadow-[6px_6px_0_#111]">{suggestions.map((suggestion, index) => <button id={`${listId}-${index}`} key={suggestion.placeId} type="button" role="option" aria-selected={active === index} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(suggestion)} className={`block w-full border-b border-border px-4 py-3 text-left text-sm last:border-b-0 hover:bg-muted ${active === index ? 'bg-muted' : ''}`}>{suggestion.label}</button>)}</div>}
      <p role="status" className="mt-2 text-sm font-normal leading-5 text-muted-foreground">{message || (placeId ? 'Location selected.' : searching ? 'Finding locations…' : 'Choose a result from the suggestions to confirm your starting point.')}</p>
      {dataMode === 'preview' && <p className="mt-1 text-sm font-normal text-muted-foreground">Preview: eight sample neighbourhoods are available until live location search is connected.</p>}
      {dataMode === 'live' && <p className="mt-1 text-xs font-normal text-muted-foreground">Location suggestions provided by Google Maps</p>}
    </div>
  );
}
