'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import type { Place, Pint } from '@/lib/types';
import Journal from './Journal';
import LogPint from './LogPint';
import Stats from './Stats';

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => <p className="muted">Loading map…</p>,
});

type Tab = 'journal' | 'log' | 'map' | 'stats';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'journal', label: 'Journal', icon: '📖' },
  { id: 'log', label: 'Log', icon: '🍺' },
  { id: 'map', label: 'Map', icon: '🗺️' },
  { id: 'stats', label: 'Stats', icon: '📊' },
];

export default function AppShell({ session }: { session: Session }) {
  const [tab, setTab] = useState<Tab>('journal');
  const [places, setPlaces] = useState<Place[]>([]);
  const [pints, setPints] = useState<Pint[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const supabase = getSupabase();
    const [placesRes, pintsRes] = await Promise.all([
      supabase.from('places').select('*').order('created_at', { ascending: false }),
      supabase.from('pints').select('*').order('drank_at', { ascending: false }),
    ]);
    if (placesRes.error || pintsRes.error) {
      setError((placesRes.error || pintsRes.error)?.message ?? 'Could not load your data.');
      setLoading(false);
      return;
    }
    const nextPlaces = (placesRes.data ?? []) as Place[];
    const nextPints = (pintsRes.data ?? []) as Pint[];
    setPlaces(nextPlaces);
    setPints(nextPints);

    const paths = nextPints.map((p) => p.photo_path).filter((p): p is string => !!p);
    if (paths.length) {
      const { data } = await supabase.storage.from('pint-photos').createSignedUrls(paths, 3600);
      const map: Record<string, string> = {};
      (data ?? []).forEach((item) => {
        if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
      });
      setPhotoUrls(map);
    } else {
      setPhotoUrls({});
    }
    setError('');
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function signOut() {
    await getSupabase().auth.signOut();
  }

  return (
    <>
      <main className="shell">
        <header className="topbar">
          <div className="brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" />
            Tap Trail
          </div>
          <button className="ghost" onClick={signOut} aria-label={`Sign out ${session.user.email ?? ''}`}>
            Sign out
          </button>
        </header>

        {error && <p className="error" role="alert">{error}</p>}
        {loading ? (
          <p className="muted">Loading your trail…</p>
        ) : (
          <>
            {tab === 'journal' && (
              <Journal
                pints={pints}
                places={places}
                photoUrls={photoUrls}
                onChanged={load}
                onLog={() => setTab('log')}
              />
            )}
            {tab === 'log' && (
              <LogPint
                userId={session.user.id}
                places={places}
                onSaved={async () => {
                  await load();
                  setTab('journal');
                }}
              />
            )}
            {tab === 'map' && <MapView places={places} pints={pints} />}
            {tab === 'stats' && <Stats pints={pints} places={places} />}
          </>
        )}
      </main>

      <nav className="nav" aria-label="Main">
        <div className="nav-inner">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? 'active' : ''}
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => setTab(t.id)}
            >
              <span className="ico" aria-hidden="true">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
