'use client';

import { useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import type { Place, Pint } from '@/lib/types';
import { formatDate, formatRating, guinnessAverage } from '@/lib/format';

type Props = {
  pints: Pint[];
  places: Place[];
  photoUrls: Record<string, string>;
  onChanged: () => Promise<void>;
  onLog: () => void;
};

export default function Journal({ pints, places, photoUrls, onChanged, onLog }: Props) {
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const placeById = new Map(places.map((p) => [p.id, p]));

  async function remove(pint: Pint) {
    if (!window.confirm(`Delete "${pint.beer_name}" from your journal?`)) return;
    setBusyId(pint.id);
    setError('');
    const supabase = getSupabase();
    const { error: err } = await supabase.from('pints').delete().eq('id', pint.id);
    if (err) {
      setError(err.message);
    } else {
      if (pint.photo_path) await supabase.storage.from('pint-photos').remove([pint.photo_path]);
      await onChanged();
    }
    setBusyId(null);
  }

  if (!pints.length) {
    return (
      <div className="card empty">
        <h2>Your trail starts here</h2>
        <p className="muted">Log your first pint and it will show up here and on the map.</p>
        <button className="primary" onClick={onLog}>Log a pint</button>
      </div>
    );
  }

  return (
    <div>
      {error && <p className="error" role="alert">{error}</p>}
      {pints.map((p) => {
        const place = placeById.get(p.place_id);
        const avg = p.is_guinness ? guinnessAverage(p) : null;
        const photo = p.photo_path ? photoUrls[p.photo_path] : undefined;
        return (
          <article className="card" key={p.id}>
            <div className="row spread">
              <h3>{p.beer_name}</h3>
              <span className="stars" aria-label={`${p.rating} out of 5`}>{formatRating(p.rating)}</span>
            </div>
            <div className="muted">
              {[p.brewery, p.style].filter(Boolean).join(' · ')}
            </div>
            <div style={{ marginTop: 6 }}>
              {place ? place.name : 'Unknown place'}
              {place?.city ? <span className="muted">, {place.city}</span> : null}
              {place?.country ? <span className="muted">, {place.country}</span> : null}
            </div>
            <div className="muted" style={{ fontSize: 13 }}>{formatDate(p.drank_at)}</div>
            {p.is_guinness && (
              <div className="row wrap" style={{ marginTop: 8 }}>
                <span className="badge">Guinness</span>
                {avg !== null && <span className="muted">Pour score {avg.toFixed(1)} / 5</span>}
              </div>
            )}
            {p.is_guinness && (
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                Pour {p.pour_score ?? '–'} · Head {p.head_score ?? '–'} · Temp {p.temp_score ?? '–'} · Creamy {p.creamy_score ?? '–'}
              </div>
            )}
            {p.notes && <p style={{ marginBottom: 0 }}>{p.notes}</p>}
            {photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="photo" src={photo} alt={`${p.beer_name} at ${place?.name ?? 'the pub'}`} />
            )}
            <div style={{ marginTop: 8 }}>
              <button className="danger" disabled={busyId === p.id} onClick={() => remove(p)}>
                {busyId === p.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
