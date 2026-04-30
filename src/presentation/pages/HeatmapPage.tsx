import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoJsonObject } from 'geojson';
import HeatmapVisualization from '../components/HeatmapVisualization';
import { useConflictData } from '../hooks/useConflictData';
import { ConflictEvent } from '../../domain/entities/ConflictEvent';

const GEO_COUNTRIES_URL =
  'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';

const HeatmapPage: React.FC = () => {
  const { events, loading } = useConflictData();
  const [geojsonData, setGeojsonData] = useState<GeoJsonObject | null>(null);
  const [allDates, setAllDates] = useState<string[]>([]);
  const [dateValue, setDateValue] = useState<number>(0);
  const [showDateSlider, setShowDateSlider] = useState<boolean>(false);

  useEffect(() => {
    fetch(GEO_COUNTRIES_URL)
      .then((r) => r.json())
      .then(setGeojsonData);
  }, []);

  useEffect(() => {
    if (events.length === 0) return;
    const unique = [...new Set(events.map((e) => e.eventDate))].sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );
    setAllDates(unique);
    setDateValue(0);
  }, [events]);

  const formatDate = (date: string): string =>
    new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const filteredEvents: ConflictEvent[] =
    showDateSlider && allDates.length > 0
      ? events.filter((e) => e.eventDate === allDates[dateValue])
      : events;

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px', background: '#f0f0f0' }}>
        <button
          onClick={() => setShowDateSlider((v) => !v)}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            border: '1px solid #e1e4e8',
            background: 'white',
            color: '#24292e',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          {showDateSlider ? 'Hide Timeline' : 'Show Timeline'}
        </button>

        {showDateSlider && (
          <div
            style={{
              marginTop: '10px',
              padding: '15px',
              backgroundColor: 'white',
              borderRadius: '20px',
              border: '1px solid #e1e4e8',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '8px', fontSize: '14px', color: '#24292e' }}>
              {allDates[dateValue] && formatDate(allDates[dateValue])}
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(0, allDates.length - 1)}
              value={dateValue}
              onChange={(e) => setDateValue(parseInt(e.target.value))}
              style={{ width: '100%', height: '4px', borderRadius: '2px', cursor: 'pointer' }}
            />
          </div>
        )}
      </div>

      <MapContainer
        center={[48.5, 37.5]}
        zoom={5}
        style={{ flex: 1 }}
        maxBounds={[[-90, -180], [90, 180]]}
        minZoom={3}
        maxZoom={9.5}
      >
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        {geojsonData && (
          <GeoJSON
            data={geojsonData}
            style={(feature) => {
              const country = feature?.properties?.['ADMIN'] as string | undefined;
              return country === 'Ukraine' || country === 'Russia'
                ? { color: '#2b2b2b', weight: 2, fillOpacity: 0 }
                : { color: 'transparent', weight: 0, fillOpacity: 0 };
            }}
          />
        )}
        <HeatmapVisualization data={filteredEvents} />
      </MapContainer>
    </div>
  );
};

export default HeatmapPage;
