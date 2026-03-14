'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shuffle } from 'lucide-react';

interface BoredActivity {
  activity: string;
  type: string;
  participants: number;
}

export function BoredSuggestion() {
  const [activity, setActivity] = useState<BoredActivity | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/enrichment/bored');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setActivity(data);
      setFailed(false);
    } catch {
      setFailed(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  if (failed || (!activity && !loading)) return null;

  return (
    <div className="bg-elevated border border-border-subtle rounded-lg p-3 mt-4 max-w-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
          Bored? Try this
        </span>
        <button
          onClick={fetchActivity}
          disabled={loading}
          className="text-text-muted hover:text-text-secondary transition-colors disabled:opacity-50"
        >
          <Shuffle size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      {activity && (
        <p className="text-xs text-text-secondary leading-relaxed">
          {activity.activity}
        </p>
      )}
    </div>
  );
}
