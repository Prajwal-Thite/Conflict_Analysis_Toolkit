import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, Popup, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import L from 'leaflet';
import 'leaflet-draw';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import type { GeoJsonObject } from 'geojson';
import { useConflictData } from '../hooks/useConflictData';
import { ConflictEvent } from '../../domain/entities/ConflictEvent';
import { MarkerColor } from '../../domain/entities/ConflictEvent';

const GEO_COUNTRIES_URL =
  'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';

const ICON_MAP: Record<string, string> = {
  'Air/drone strike': '/Icons/drone.svg',
  'Shelling/artillery/missile attack': '/Icons/artillery.svg',
  Arrests: '/Icons/arrest.svg',
  'Disrupted weapons use': '/Icons/disrupted.svg',
  'Peaceful protest': '/Icons/protest.svg',
  'Non-state actor overtakes territory': '/Icons/non_state_actor.svg',
  'Remote explosive/landmine/IED': '/Icons/explosive.svg',
  Other: '/Icons/other.svg',
  Attack: '/Icons/attack.svg',
  Grenade: '/Icons/grenade.svg',
  'Change to group/activity': '/Icons/group.svg',
  'Looting/property destruction': '/Icons/destruction.svg',
  'Abduction/forced disappearance': '/Icons/abduction.svg',
  'Government regains territory': '/Icons/regains_territory.svg',
  Agreement: '/Icons/agreement.svg',
  'Mob violence': '/Icons/mob_violence.svg',
  'Non-violent transfer of territory': '/Icons/non_violent.svg',
  'Armed clash': '/Icons/armed_clash.svg',
};

const COLOR_FILTER: Record<MarkerColor, string> = {
  red: 'invert(27%) sepia(51%) saturate(2878%) hue-rotate(346deg) brightness(104%) contrast(97%)',
  black: 'brightness(0%)',
  gray: 'invert(50%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%)',
};

type DisplayMode = 'events' | 'fatalities' | 'none';

function getEventIcon(subEventType: string, color: MarkerColor): L.DivIcon {
  const src = `${process.env.PUBLIC_URL}${ICON_MAP[subEventType] ?? '/default-icon.svg'}`;
  return L.divIcon({
    html: `<img src="${src}" style="width:25px;height:25px;filter:${COLOR_FILTER[color]};" />`,
    className: 'custom-div-icon',
    iconSize: [25, 25],
  });
}

const GeoMapPage: React.FC = () => {
  const { events, loading } = useConflictData();
  const [geojsonData, setGeojsonData] = useState<GeoJsonObject | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('events');
  const [showDateSlider, setShowDateSlider] = useState<boolean>(false);
  const [dateValue, setDateValue] = useState<number>(0);
  const [allDates, setAllDates] = useState<string[]>([]);

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

  const clusterOptions = {
    polygonOptions: { fillColor: '#f5f5f5', color: '#000000', weight: 1, opacity: 1, fillOpacity: 0.5 },
    disableClusteringAtZoom: 19,
    spiderfyDistanceMultiplier: 2,
    chunkedLoading: true,
    maxClusterRadius: 50,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: true,
    removeOutsideVisibleBounds: true,
    animate: true,
  };

  const fatalityClusterOptions = {
    ...clusterOptions,
    iconCreateFunction: (cluster: L.MarkerCluster) => {
      const children = cluster.getAllChildMarkers();
      const totalFatalities = children.reduce((sum, marker) => {
        const props = marker.options.properties as { fatalities?: number } | undefined;
        return sum + (props?.fatalities ?? 0);
      }, 0);
      const size = totalFatalities < 10 ? 'small' : totalFatalities < 100 ? 'medium' : 'large';
      return new L.DivIcon({
        html: `<div><span>${totalFatalities}</span></div>`,
        className: `marker-cluster marker-cluster-${size}`,
        iconSize: new L.Point(40, 40),
      });
    },
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px', background: '#f0f0f0' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() =>
              setDisplayMode((prev) =>
                prev === 'events' ? 'fatalities' : prev === 'fatalities' ? 'none' : 'events'
              )
            }
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
            Show: {displayMode === 'events' ? 'Events' : displayMode === 'fatalities' ? 'Fatalities' : 'None'}
          </button>

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
        </div>

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
        minZoom={2}
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
              if (country === 'Ukraine')
                return { color: 'black', weight: 1, fillColor: 'yellow', fillOpacity: 0.4, dashArray: '5, 5' };
              if (country === 'Russia')
                return { color: 'gray', weight: 2, fillColor: 'blue', fillOpacity: 0.4, dashArray: '5, 5' };
              return { color: 'gray', fillColor: 'lightgray', fillOpacity: 0.2 };
            }}
          />
        )}

        {displayMode === 'events' && (
          <MarkerClusterGroup key={`events-${dateValue}`} {...clusterOptions}>
            {filteredEvents.map((event, index) => (
              <Marker
                key={`${index}-${dateValue}`}
                position={[event.location.lat, event.location.lng]}
                icon={getEventIcon(event.subEventType, event.markerColor)}
              >
                <Popup>
                  <div style={{ fontFamily: 'math', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ position: 'relative', width: '60px', height: '60px' }}>
                      <div
                        style={{
                          position: 'absolute',
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          backgroundColor: '#A9A9A9',
                          zIndex: 1,
                        }}
                      />
                      <img
                        src={`${process.env.PUBLIC_URL}${ICON_MAP[event.subEventType] ?? '/default-icon.svg'}`}
                        alt={event.subEventType}
                        style={{
                          width: '60px',
                          height: '60px',
                          position: 'relative',
                          zIndex: 2,
                          filter: COLOR_FILTER[event.markerColor],
                        }}
                      />
                    </div>
                    <div>
                      <div style={{ color: '#333', marginBottom: '20px' }}>
                        <strong>Sub Event Type:</strong> {event.subEventType}
                      </div>
                      <div style={{ color: '#333', marginBottom: '0.5px' }}>
                        <strong>Date:</strong> {event.eventDate}
                      </div>
                      <div style={{ color: '#333', display: 'flex', alignItems: 'center' }}>
                        <strong>Fatalities:</strong>&nbsp;{event.fatalities}
                        {event.fatalities <= 5 && (
                          <img src={`${process.env.PUBLIC_URL}/Icons/fatality_low.svg`} style={{ width: '80px', height: '80px', marginLeft: '5px' }} alt="Low" />
                        )}
                        {event.fatalities > 5 && event.fatalities <= 20 && (
                          <img src={`${process.env.PUBLIC_URL}/Icons/fatality_medium.svg`} style={{ width: '80px', height: '80px', marginLeft: '5px' }} alt="Medium" />
                        )}
                        {event.fatalities > 20 && (
                          <img src={`${process.env.PUBLIC_URL}/Icons/fatality_high.svg`} style={{ width: '80px', height: '80px', marginLeft: '5px' }} alt="High" />
                        )}
                      </div>
                      <div style={{ color: '#333' }}>
                        <strong>Notes:</strong> {event.notes}
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        )}

        {displayMode === 'fatalities' && (
          <MarkerClusterGroup key={`fatalities-${dateValue}`} {...fatalityClusterOptions}>
            {filteredEvents.map((event, index) => (
              <Marker
                key={`${index}-${dateValue}`}
                position={[event.location.lat, event.location.lng]}
                eventHandlers={{
                  add: (e) => {
                    const marker = e.target as L.Marker;
                    marker.options.properties = { fatalities: event.fatalities };
                  },
                }}
                icon={L.divIcon({
                  html: `<div style="background-color:${event.markerColor};color:white;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-weight:bold;">${event.fatalities}</div>`,
                  className: '',
                })}
              >
                <Popup>
                  <div>
                    <h3>Fatalities: {event.fatalities}</h3>
                    <p>Event Type: {event.subEventType}</p>
                    <p>Date: {event.eventDate}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        )}
      </MapContainer>
    </div>
  );
};

export default GeoMapPage;
