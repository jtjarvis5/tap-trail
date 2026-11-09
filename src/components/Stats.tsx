'use client';

import type { Place, Pint } from '@/lib/types';
import { formatRating, guinnessAverage } from '@/lib/format';

export default function Stats({ pints, places }: { pints: Pint[]; places: Place[] }) {
  if (!pints.length) {
    return (
      <div className="card empty">
        <h2>No stats yet</h2>
        <p className="muted">Log a few pints and your numbers will show up here.</p>
      </div>
    );
  }

  const placeById = new Map(places.map((p) => [p.id, p]));
  const visitedPlaceIds = new Set(pints.map((p) => p.place_id));
  const countries = new Set(
    [...visitedPlaceIds]
      .map((id) => placeById.get(id)?.country)
      .filter((c): c is string => !!c)
  );
  const avgRating = pints.reduce((sum, p) => sum + p.rating, 0) / pints.length;

  const topRated = [...pints].sort((a, b) => b.rating - a.rating).slice(0, 5);

  const styleCounts = new Map<string, number>();
  pints.forEach((p) => {
    if (p.style) styleCounts.set(p.style, (styleCounts.get(p.style) ?? 0) + 1);
  });
  const topStyles = [...styleCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const guinnessPints = pints.filter((p) => p.is_guinness);
  const guinnessByPlace = new Map<string, number[]>();
  guinnessPints.forEach((p) => {
    const avg = guinnessAverage(p);
    if (avg === null) return;
    guinnessByPlace.set(p.place_id, [...(guinnessByPlace.get(p.place_id) ?? []), avg]);
  });
  const guinnessRanking = [...guinnessByPlace.entries()]
    .map(([placeId, scores]) => ({
      place: placeById.get(placeId),
      avg: scores.reduce((a, b) => a + b, 0) / scores.length,
      count: scores.length,
    }))
    .filter((r) => r.place)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);

  return (
    <div>
      <div className="stat-grid">
        <div className="stat"><div className="n">{pints.length}</div><div className="muted">Pints logged</div></div>
        <div className="stat"><div className="n">{visitedPlaceIds.size}</div><div className="muted">Places</div></div>
        <div className="stat"><div className="n">{avgRating.toFixed(1)}</div><div className="muted">Average rating</div></div>
        <div className="stat"><div className="n">{countries.size}</div><div className="muted">Countries</div></div>
      </div>

      <section className="card">
        <h3>Top rated</h3>
        {topRated.map((p) => (
          <div className="row spread" key={p.id} style={{ marginTop: 8 }}>
            <span>
              {p.beer_name}
              <span className="muted"> · {placeById.get(p.place_id)?.name ?? 'Unknown'}</span>
            </span>
            <span className="stars">{formatRating(p.rating)}</span>
          </div>
        ))}
      </section>

      {topStyles.length > 0 && (
        <section className="card">
          <h3>Favorite styles</h3>
          {topStyles.map(([style, count]) => (
            <div className="row spread" key={style} style={{ marginTop: 8 }}>
              <span>{style}</span>
              <span className="muted">{count}</span>
            </div>
          ))}
        </section>
      )}

      {guinnessRanking.length > 0 && (
        <section className="card">
          <h3>Best Guinness pours</h3>
          <p className="muted" style={{ marginTop: 4 }}>
            {guinnessPints.length} Guinness logged, ranked by average pour score
          </p>
          {guinnessRanking.map((r, i) => (
            <div className="row spread" key={r.place?.id} style={{ marginTop: 8 }}>
              <span>
                {i + 1}. {r.place?.name}
                {r.place?.city ? <span className="muted">, {r.place.city}</span> : null}
              </span>
              <span className="stars">{r.avg.toFixed(1)}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
