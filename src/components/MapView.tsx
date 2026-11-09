'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Place, Pint } from '@/lib/types';
import { formatRating } from '@/lib/format';

const STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
      maxzoom: 19,
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

export default function MapView({ places, pints }: { places: Place[]; pints: Pint[] }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;

    const visited = places.filter((pl) => pints.some((pi) => pi.place_id === pl.id));
    const map = new maplibregl.Map({
      container: container.current,
      style: STYLE,
      center: visited.length ? [visited[0].lng, visited[0].lat] : [-20, 45],
      zoom: visited.length ? 5 : 1.5,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    visited.forEach((place) => {
      const here = pints.filter((pi) => pi.place_id === place.id);

      const pin = document.createElement('div');
      pin.className = 'pin';
      pin.textContent = String(here.length);
      pin.setAttribute('role', 'img');
      pin.setAttribute('aria-label', `${place.name}, ${here.length} pints`);

      const content = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = place.name;
      content.appendChild(title);
      here.slice(0, 5).forEach((pi) => {
        const line = document.createElement('div');
        line.textContent = `${pi.beer_name} ${formatRating(pi.rating)}`;
        content.appendChild(line);
      });
      if (here.length > 5) {
        const more = document.createElement('div');
        more.textContent = `+${here.length - 5} more`;
        content.appendChild(more);
      }

      new maplibregl.Marker({ element: pin })
        .setLngLat([place.lng, place.lat])
        .setPopup(new maplibregl.Popup({ offset: 16 }).setDOMContent(content))
        .addTo(map);
    });

    if (visited.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      visited.forEach((pl) => bounds.extend([pl.lng, pl.lat]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 12, duration: 0 });
    }

    return () => map.remove();
  }, [places, pints]);

  return (
    <div>
      <div ref={container} className="map-wrap" />
      {!pints.length && (
        <p className="muted" style={{ textAlign: 'center' }}>
          Log a pint and its pub will land on the map.
        </p>
      )}
    </div>
  );
}
