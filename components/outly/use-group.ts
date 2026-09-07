'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PublicGroupView } from '@/lib/outly-types';

export function useGroup(token: string, poll = true) {
  const [view, setView] = useState<PublicGroupView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch(`/api/groups/${encodeURIComponent(token)}`, { cache: 'no-store' });
      const payload = await response.json() as PublicGroupView & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Could not load this group.');
      setView(payload); setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load this group.'); }
    finally { if (!quiet) setLoading(false); }
  }, [token]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!poll) return;
    const timer = window.setInterval(() => void refresh(true), 8000);
    return () => window.clearInterval(timer);
  }, [poll, refresh]);

  return { view, loading, error, refresh };
}
