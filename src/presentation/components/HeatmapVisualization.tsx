import React from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { ConflictEvent } from '../../domain/entities/ConflictEvent';

interface HeatmapVisualizationProps {
  data: ConflictEvent[];
}

type NormalizedScale = 'National' | 'Regional' | 'Other';

const SOURCE_SCALE_MAP: Record<string, NormalizedScale> = {
  National: 'National',
  'National-Regional': 'National',
  'New media-National': 'National',
  'Subnational-National': 'National',
  'Other-National': 'National',
  Other: 'Other',
  Subnational: 'Other',
  'Other-Subnational': 'Other',
  'New media': 'Other',
  'Other-New media': 'Other',
  Regional: 'Regional',
  'Other-Regional': 'Regional',
  'New media-Regional': 'Regional',
};

const INTENSITY: Record<NormalizedScale, number> = {
  National: 1.0,
  Regional: 0.6,
  Other: 0.3,
};

function getIntensity(scale: string): number {
  const normalized: NormalizedScale = SOURCE_SCALE_MAP[scale] ?? 'Other';
  return INTENSITY[normalized];
}

type HeatPoint = [number, number, number];

function aggregatePoints(data: ConflictEvent[]): HeatPoint[] {
  const locationMap = new Map<string, { lat: number; lng: number; scales: Map<NormalizedScale, number> }>();

  data.forEach((event) => {
    const key = `${event.location.lat},${event.location.lng}`;
    if (!locationMap.has(key)) {
      locationMap.set(key, { lat: event.location.lat, lng: event.location.lng, scales: new Map() });
    }
    const loc = locationMap.get(key)!;
    const normalized: NormalizedScale = SOURCE_SCALE_MAP[event.sourceScale] ?? 'Other';
    loc.scales.set(normalized, (loc.scales.get(normalized) ?? 0) + 1);
  });

  return Array.from(locationMap.values()).map((loc) => {
    let maxCount = 0;
    let dominantScale: NormalizedScale = 'Other';
    loc.scales.forEach((count, scale) => {
      if (count > maxCount) {
        maxCount = count;
        dominantScale = scale;
      }
    });
    return [loc.lat, loc.lng, getIntensity(dominantScale)];
  });
}

const HeatmapVisualization: React.FC<HeatmapVisualizationProps> = ({ data }) => {
  const map = useMap();

  React.useEffect(() => {
    if (!data || data.length === 0) return;

    const aggregated = aggregatePoints(data);
    const heatLayer = L.heatLayer(aggregated, {
      radius: 25,
      blur: 15,
      minOpacity: 0.5,
      maxZoom: 10,
      minZoom: 2,
      gradient: {
        '0.3': '#00008B',
        '1.0': '#d73027',
        '0.6': '#1a9850',
      },
    }).addTo(map);

    const LegendControl = L.Control.extend({
      onAdd(): HTMLElement {
        const div = document.createElement('div');
        div.className = 'info legend';
        div.style.backgroundColor = 'white';
        div.style.padding = '10px';
        div.style.borderRadius = '5px';
        div.style.border = '2px solid rgba(0,0,0,0.2)';

        const scales: NormalizedScale[] = ['Regional', 'National', 'Other'];
        const colors = ['#1a9850', '#d73027', '#00008B'];

        div.innerHTML += '<h4>Source Scale</h4>';
        scales.forEach((scale, i) => {
          div.innerHTML += `<div style="margin:5px;">
            <i style="background:${colors[i]};width:15px;height:15px;display:inline-block;border-radius:50%;margin-right:5px;"></i>
            ${scale}
          </div>`;
        });

        return div;
      },
    });
    const legend = new LegendControl({ position: 'bottomright' as L.ControlPosition });
    legend.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
      map.removeControl(legend);
    };
  }, [map, data]);

  return null;
};

export default HeatmapVisualization;
