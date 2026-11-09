'use client';

import { useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { PLACE_KINDS, type Place } from '@/lib/types';
import { formatRating, toLocalInputValue } from '@/lib/format';

type Candidate = {
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  lat: number;
  lng: number;
};

type Picked = { type: 'existing'; place: Place } | { type: 'new'; candidate: Candidate };

type NominatimItem = {
  name?: string;
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
};

type Props = {
  userId: string;
  places: Place[];
  onSaved: () => Promise<void>;
};

const SCORE_FIELDS = [
  { key: 'pour', label: 'Pour' },
  { key: 'head', label: 'Head' },
  { key: 'temp', label: 'Temperature' },
  { key: 'creamy', label: 'Creaminess' },
] as const;

type ScoreKey = (typeof SCORE_FIELDS)[number]['key'];

export default function LogPint({ userId, places, onSaved }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Candidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [kind, setKind] = useState<string>('pub');

  const [beer, setBeer] = useState('');
  const [brewery, setBrewery] = useState('');
  const [style, setStyle] = useState('');
  const [rating, setRating] = useState(4);
  const [notes, setNotes] = useState('');
  const [when, setWhen] = useState(toLocalInputValue(new Date()));
  const [photo, setPhoto] = useState<File | null>(null);

  const [isGuinness, setIsGuinness] = useState(false);
  const [scores, setScores] = useState<Record<ScoreKey, number>>({
    pour: 3,
    head: 3,
    temp: 3,
    creamy: 3,
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function search() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setError('');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&q=${encodeURIComponent(q)}`
      );
      if (!res.ok) throw new Error('Place search failed. Try again in a moment.');
      const items = (await res.json()) as NominatimItem[];
      setResults(
        items.map((it) => {
          const a = it.address ?? {};
          return {
            name: it.name || it.display_name.split(',')[0],
            address: it.display_name,
            city: a.city || a.town || a.village || a.hamlet || null,
            country: a.country || null,
            lat: parseFloat(it.lat),
            lng: parseFloat(it.lon),
          };
        })
      );
      if (!items.length) setError('No matches. Try adding the town or city.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Place search failed.');
    }
    setSearching(false);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError('Location is not available on this device.');
      return;
    }
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPicked({
          type: 'new',
          candidate: {
            name: query.trim() || 'Pinned location',
            address: null,
            city: null,
            country: null,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          },
        });
        setResults([]);
      },
      () => setError('Could not get your location. Search for the place instead.')
    );
  }

  function toggleGuinness(on: boolean) {
    setIsGuinness(on);
    if (on) {
      if (!beer.trim()) setBeer('Guinness Draught');
      if (!brewery.trim()) setBrewery('Guinness');
      if (!style.trim()) setStyle('Irish Dry Stout');
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!picked) {
      setError('Pick where you had it first.');
      return;
    }
    setBusy(true);
    setError('');
    const supabase = getSupabase();

    try {
      let placeId: string;
      if (picked.type === 'existing') {
        placeId = picked.place.id;
      } else {
        const c = picked.candidate;
        const { data, error: placeErr } = await supabase
          .from('places')
          .insert({
            user_id: userId,
            name: c.name,
            kind,
            address: c.address,
            city: c.city,
            country: c.country,
            lat: c.lat,
            lng: c.lng,
          })
          .select('id')
          .single();
        if (placeErr || !data) throw new Error(placeErr?.message ?? 'Could not save the place.');
        placeId = data.id as string;
      }

      let photoPath: string | null = null;
      if (photo) {
        const ext = (photo.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
        photoPath = `${userId}/${crypto.randomUUID()}.${ext || 'jpg'}`;
        const { error: upErr } = await supabase.storage
          .from('pint-photos')
          .upload(photoPath, photo, { contentType: photo.type || undefined });
        if (upErr) throw new Error(`Photo upload failed: ${upErr.message}`);
      }

      const { error: pintErr } = await supabase.from('pints').insert({
        user_id: userId,
        place_id: placeId,
        beer_name: beer.trim(),
        brewery: brewery.trim() || null,
        style: style.trim() || null,
        rating,
        notes: notes.trim() || null,
        photo_path: photoPath,
        is_guinness: isGuinness,
        pour_score: isGuinness ? scores.pour : null,
        head_score: isGuinness ? scores.head : null,
        temp_score: isGuinness ? scores.temp : null,
        creamy_score: isGuinness ? scores.creamy : null,
        drank_at: new Date(when).toISOString(),
      });
      if (pintErr) {
        if (photoPath) await supabase.storage.from('pint-photos').remove([photoPath]);
        throw new Error(pintErr.message);
      }

      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  const pickedName =
    picked?.type === 'existing' ? picked.place.name : picked?.type === 'new' ? picked.candidate.name : '';

  return (
    <form onSubmit={submit} className="stack">
      <section className="card stack">
        <h3>Where were you?</h3>

        {picked ? (
          <div className="row spread">
            <div>
              <strong>{pickedName}</strong>
              {picked.type === 'new' && picked.candidate.city && (
                <span className="muted">, {picked.candidate.city}</span>
              )}
            </div>
            <button type="button" className="ghost" onClick={() => setPicked(null)}>
              Change
            </button>
          </div>
        ) : (
          <>
            {places.length > 0 && (
              <div>
                <label>Your places</label>
                <div className="row wrap">
                  {places.slice(0, 8).map((pl) => (
                    <button
                      type="button"
                      className="chip"
                      key={pl.id}
                      onClick={() => setPicked({ type: 'existing', place: pl })}
                    >
                      {pl.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label htmlFor="place-search">Search for a pub, bar or brewery</label>
              <div className="row">
                <input
                  id="place-search"
                  value={query}
                  placeholder="e.g. The Brazen Head, Dublin"
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      search();
                    }
                  }}
                />
                <button type="button" onClick={search} disabled={searching || !query.trim()}>
                  {searching ? '…' : 'Search'}
                </button>
              </div>
            </div>
            <button type="button" className="ghost" onClick={useMyLocation}>
              📍 Use my current location
            </button>
            {results.map((c, i) => (
              <button
                type="button"
                key={`${c.lat}-${c.lng}-${i}`}
                style={{ textAlign: 'left', height: 'auto', padding: '10px 12px' }}
                onClick={() => {
                  setPicked({ type: 'new', candidate: c });
                  setResults([]);
                }}
              >
                <strong>{c.name}</strong>
                <div className="muted" style={{ fontSize: 13 }}>
                  {[c.city, c.country].filter(Boolean).join(', ')}
                </div>
              </button>
            ))}
          </>
        )}

        {picked?.type === 'new' && (
          <div>
            <label htmlFor="kind">Type of place</label>
            <select id="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
              {PLACE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      <section className="card stack">
        <h3>The beer</h3>
        <label className="row" style={{ color: 'var(--text)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isGuinness}
            onChange={(e) => toggleGuinness(e.target.checked)}
          />
          Guinness mode (score the pour)
        </label>
        <div>
          <label htmlFor="beer">Beer</label>
          <input id="beer" required maxLength={200} value={beer} onChange={(e) => setBeer(e.target.value)} />
        </div>
        <div className="row">
          <div style={{ flex: 1 }}>
            <label htmlFor="brewery">Brewery</label>
            <input id="brewery" value={brewery} onChange={(e) => setBrewery(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="style">Style</label>
            <input id="style" value={style} placeholder="IPA, Stout…" onChange={(e) => setStyle(e.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor="rating">
            Rating: <span className="stars">{formatRating(rating)}</span> ({rating})
          </label>
          <input
            id="rating"
            type="range"
            min={0.5}
            max={5}
            step={0.5}
            value={rating}
            onChange={(e) => setRating(parseFloat(e.target.value))}
          />
        </div>

        {isGuinness &&
          SCORE_FIELDS.map((f) => (
            <div key={f.key}>
              <label htmlFor={`score-${f.key}`}>
                {f.label}: {scores[f.key]} / 5
              </label>
              <input
                id={`score-${f.key}`}
                type="range"
                min={1}
                max={5}
                step={1}
                value={scores[f.key]}
                onChange={(e) => setScores({ ...scores, [f.key]: parseInt(e.target.value, 10) })}
              />
            </div>
          ))}
      </section>

      <section className="card stack">
        <h3>Details</h3>
        <div>
          <label htmlFor="when">When</label>
          <input id="when" type="datetime-local" required value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>
        <div>
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            rows={3}
            maxLength={2000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How did it taste? Who was with you?"
          />
        </div>
        <div>
          <label htmlFor="photo">Photo (up to 5 MB)</label>
          <input
            id="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (f && f.size > 5 * 1024 * 1024) {
                setError('That photo is over 5 MB. Pick a smaller one.');
                e.target.value = '';
                setPhoto(null);
                return;
              }
              setError('');
              setPhoto(f);
            }}
          />
        </div>
      </section>

      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary" type="submit" disabled={busy} style={{ width: '100%' }}>
        {busy ? 'Saving…' : 'Save pint'}
      </button>
    </form>
  );
}
