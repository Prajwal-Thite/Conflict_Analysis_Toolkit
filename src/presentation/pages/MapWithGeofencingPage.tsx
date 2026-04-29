import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, Popup, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import L from 'leaflet';
import 'leaflet-draw';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import type { GeoJsonObject } from 'geojson';

import ParallelCoordinatesPlot from '../components/Pcp';
import PixelVisualization from '../components/PixelVisualisation';
import HeatmapVisualization from '../components/HeatmapVisualization';
import WordCloud from '../components/WordCloud';
import ThemeRiver from '../components/ThemeRiver';
import { useConflictData } from '../hooks/useConflictData';
import { ConflictEvent, MarkerColor } from '../../domain/entities/ConflictEvent';

const GEO_COUNTRIES_URL =
  'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';

type DisplayMode = 'events' | 'fatalities' | 'none';
type FatalityFilter = 'all' | 'low' | 'medium' | 'high';

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

const EVENT_BACKGROUND_COLOR: Record<string, string> = {
  'Air/drone strike': '#FFE6E6',
  Arrests: '#E6FFE6',
  'Disrupted weapons use': '#FFF0E6',
  'Shelling/artillery/missile attack': '#FFE6FF',
  'Armed clash': '#E6FFFF',
  'Peaceful protest': '#E6F0FF',
  'Non-state actor overtakes territory': '#F0E6FF',
  Attack: '#FFE6F0',
  'Remote explosive/landmine/IED': '#F0FFE6',
  Other: '#F5F5F5',
  Grenade: '#FFE6B3',
  'Change to group/activity': '#B3E6FF',
  'Looting/property destruction': '#FFB3E6',
  'Abduction/forced disappearance': '#E6B3FF',
  'Government regains territory': '#B3FFE6',
  Agreement: '#E6FFB3',
  'Mob violence': '#FFE6CC',
  'Non-violent transfer of territory': '#CCE6FF',
};

function getEventIcon(subEventType: string, color: MarkerColor): L.DivIcon {
  const src = `${process.env.PUBLIC_URL}${ICON_MAP[subEventType] ?? '/default-icon.svg'}`;
  return L.divIcon({
    html: `<img src="${src}" style="width:25px;height:25px;filter:${COLOR_FILTER[color]};" />`,
    className: 'custom-div-icon',
    iconSize: [25, 25],
  });
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const BTN_STYLE: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '20px',
  border: '1px solid #e1e4e8',
  background: 'white',
  color: '#24292e',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  fontSize: '14px',
  fontWeight: '500',
};

const MapWithGeofencingPage: React.FC = () => {
  const { events, loading } = useConflictData();
  const [geojsonData, setGeojsonData] = useState<GeoJsonObject | null>(null);
  const [drawEnabled, setDrawEnabled] = useState<boolean>(false);
  const [selectedMarkers, setSelectedMarkers] = useState<ConflictEvent[]>([]);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('events');
  const [showDateSlider, setShowDateSlider] = useState<boolean>(false);
  const [dateValue, setDateValue] = useState<number>(0);
  const [allDates, setAllDates] = useState<string[]>([]);
  const mapRef = useRef<L.Map | null>(null);
  const [selectedSubEventFilter, setSelectedSubEventFilter] = useState<string>('all');
  const [selectedFatalityFilter, setSelectedFatalityFilter] = useState<FatalityFilter>('all');
  const [showPixelPopup, setShowPixelPopup] = useState<boolean>(false);
  const [isPixelMinimized, setIsPixelMinimized] = useState<boolean>(false);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [showWordCloud, setShowWordCloud] = useState<boolean>(false);
  const [showEventInfo, setShowEventInfo] = useState<boolean>(false);

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

  const filteredEvents: ConflictEvent[] =
    showDateSlider && allDates.length > 0
      ? events.filter((e) => e.eventDate === allDates[dateValue])
      : events;

  const handleDrawCreated = (e: L.LeafletEvent): void => {
    const layer = (e as L.DrawEvents.Created).layer as L.Rectangle;
    const bounds = layer.getBounds();
    const selected = events.filter((event) =>
      bounds.contains(L.latLng(event.location.lat, event.location.lng))
    );
    setSelectedMarkers(selected);
    mapRef.current?.removeLayer(layer);
  };

  const toggleDraw = (): void => {
    setDrawEnabled((prev) => !prev);
    const map = mapRef.current;
    if (!map) return;
    if (drawEnabled) {
      if (map.drawControl) map.removeControl(map.drawControl);
    } else {
      const drawControl = new L.Control.Draw({
        draw: {
          rectangle: {
            shapeOptions: { color: 'red', fillColor: 'red', fillOpacity: 0.3, weight: 1 },
          },
          polyline: false,
          polygon: false,
          circle: false,
          marker: false,
          circlemarker: false,
        },
      });
      map.drawControl = drawControl;
      map.addControl(drawControl);
      map.on('draw:created', handleDrawCreated);
    }
  };

  const handleEventClick = (lat: number, lng: number): void => {
    mapRef.current?.flyTo([lat, lng], 12, { duration: 1.5, animate: true });
  };

  const clusterOptions = {
    polygonOptions: {
      fillColor: '#f5f5f5',
      color: '#000000',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.5,
    },
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

  const visibleSelectedMarkers = selectedMarkers.filter((event) => {
    const eventTypeMatch =
      selectedSubEventFilter === 'all' || event.subEventType === selectedSubEventFilter;
    const fatalityMatch =
      selectedFatalityFilter === 'all' ||
      event.fatalityLevel.toLowerCase() === selectedFatalityFilter;
    return eventTypeMatch && fatalityMatch;
  });

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{ padding: '10px', background: '#f0f0f0' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={toggleDraw} style={BTN_STYLE}>
            {drawEnabled ? 'Disable' : 'Enable'} Rectangle Select
          </button>

          <button
            onClick={() =>
              setDisplayMode((prev) =>
                prev === 'events' ? 'fatalities' : prev === 'fatalities' ? 'none' : 'events'
              )
            }
            style={BTN_STYLE}
          >
            Show: {displayMode === 'events' ? 'Events' : displayMode === 'fatalities' ? 'Fatalities' : 'None'}
          </button>

          <button onClick={() => setShowDateSlider((v) => !v)} style={BTN_STYLE}>
            {showDateSlider ? 'Hide Timeline' : 'Show Timeline'}
          </button>

          <button onClick={() => setShowHeatmap((v) => !v)} style={BTN_STYLE}>
            {showHeatmap ? 'Hide Heatmap' : 'Show Heatmap'}
          </button>

          <button onClick={() => setShowEventInfo((v) => !v)} style={BTN_STYLE}>
            Event Info
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
            <div
              style={{ textAlign: 'center', marginBottom: '8px', fontSize: '14px', color: '#24292e' }}
            >
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
        ref={mapRef as React.RefObject<L.Map>}
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

        {/* PCP popup — shown when region is selected and pixel view is closed */}
        {selectedMarkers.length > 0 && !showPixelPopup && (
          <div
            style={{
              position: 'fixed',
              ...(isMinimized
                ? {
                    bottom: '20px',
                    right: '20px',
                    width: '397px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }
                : {
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '85%',
                    height: '85%',
                  }),
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '10px',
              boxShadow: '0 0 20px rgba(0,0,0,0.3)',
              zIndex: 2000,
              transition: 'all 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setIsMinimized((v) => !v)} style={BTN_STYLE}>
                {isMinimized ? 'Maximize' : 'Minimize'}
              </button>
              <button
                onClick={() => {
                  setShowPixelPopup(true);
                  setIsPixelMinimized(false);
                  setIsMinimized(false);
                }}
                style={BTN_STYLE}
              >
                Show Pixel View
              </button>
              <button onClick={() => setShowWordCloud((v) => !v)} style={BTN_STYLE}>
                {showWordCloud ? 'Hide Word Cloud' : 'Show Word Cloud'}
              </button>
              <button onClick={() => setSelectedMarkers([])} style={BTN_STYLE}>
                Close
              </button>
            </div>
            {!isMinimized && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: '100%',
                  height: '100%',
                }}
              >
                <ParallelCoordinatesPlot data={selectedMarkers} />
              </div>
            )}
          </div>
        )}

        {/* Pixel visualisation popup */}
        {showPixelPopup && selectedMarkers.length > 0 && (
          <div
            style={{
              position: 'fixed',
              ...(isPixelMinimized
                ? {
                    bottom: '20px',
                    right: '20px',
                    width: '397px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }
                : {
                    top: '60%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '70%',
                    height: '40%',
                  }),
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '10px',
              boxShadow: '0 0 20px rgba(0,0,0,0.3)',
              zIndex: 2001,
              transition: 'all 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setIsPixelMinimized((v) => !v)} style={BTN_STYLE}>
                {isPixelMinimized ? 'Maximize' : 'Minimize'}
              </button>
              <button
                onClick={() => {
                  setShowPixelPopup(false);
                  setIsPixelMinimized(false);
                  setIsMinimized(false);
                }}
                style={BTN_STYLE}
              >
                Show PCP View
              </button>
              <button onClick={() => setShowWordCloud((v) => !v)} style={BTN_STYLE}>
                {showWordCloud ? 'Hide Word Cloud' : 'Show Word Cloud'}
              </button>
              <button
                onClick={() => {
                  setShowPixelPopup(false);
                  setSelectedMarkers([]);
                }}
                style={BTN_STYLE}
              >
                Close
              </button>
            </div>
            {!isPixelMinimized && <PixelVisualization data={selectedMarkers} />}
          </div>
        )}

        {/* Word cloud popup */}
        {showWordCloud && selectedMarkers.length > 0 && (
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '80%',
              height: '80%',
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '10px',
              boxShadow: '0 0 20px rgba(0,0,0,0.3)',
              zIndex: 9999,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
              <button onClick={() => setShowWordCloud(false)} style={BTN_STYLE}>
                Close
              </button>
            </div>
            <div style={{ flex: 3, overflow: 'auto' }}>
              <WordCloud data={selectedMarkers.map((e) => e.notes)} />
            </div>
          </div>
        )}

        {/* Event type distribution (ThemeRiver) popup */}
        {showEventInfo && (
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '80%',
              height: '80%',
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '10px',
              boxShadow: '0 0 20px rgba(0,0,0,0.3)',
              zIndex: 9999,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseMove={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
              <h2
                style={{
                  textAlign: 'center',
                  margin: '0',
                  fontSize: '24px',
                  fontWeight: '600',
                  width: '100%',
                }}
              >
                Event Type Distribution Over Time
              </h2>
              <button onClick={() => setShowEventInfo(false)} style={BTN_STYLE}>
                Close
              </button>
            </div>
            <div
              style={{
                flex: 1,
                overflow: 'hidden',
                backgroundColor: '#f8f9fa',
                borderRadius: '10px',
                padding: '20px',
              }}
            >
              <ThemeRiver data={events} />
            </div>
          </div>
        )}

        {/* Country borders */}
        {geojsonData && (
          <GeoJSON
            data={geojsonData}
            style={(feature) => {
              const country = feature?.properties?.['ADMIN'] as string | undefined;
              if (showHeatmap) {
                return country === 'Ukraine' || country === 'Russia'
                  ? { color: '#2b2b2b', weight: 2, fillOpacity: 0 }
                  : { color: 'transparent', weight: 0, fillOpacity: 0 };
              }
              if (country === 'Ukraine')
                return { color: 'black', weight: 1, fillColor: 'yellow', fillOpacity: 0.4, dashArray: '5, 5' };
              if (country === 'Russia')
                return { color: 'gray', weight: 2, fillColor: 'blue', fillOpacity: 0.4, dashArray: '5, 5' };
              return { color: 'gray', fillColor: 'lightgray', fillOpacity: 0.2 };
            }}
          />
        )}

        {showHeatmap && <HeatmapVisualization data={filteredEvents} />}

        {/* Marker clusters */}
        {displayMode !== 'none' &&
          (displayMode === 'events' ? (
            <MarkerClusterGroup key={`events-${dateValue}`} {...clusterOptions}>
              {filteredEvents.map((event, index) => (
                <Marker
                  key={`${index}-${dateValue}`}
                  position={[event.location.lat, event.location.lng]}
                  icon={getEventIcon(event.subEventType, event.markerColor)}
                >
                  <Popup>
                    <div
                      style={{
                        fontFamily: 'math',
                        fontSize: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px',
                      }}
                    >
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
                        <div
                          style={{ color: '#333', display: 'flex', alignItems: 'center' }}
                        >
                          <strong>Fatalities:</strong>&nbsp;{event.fatalities}
                          {event.fatalities <= 5 && (
                            <img
                              src={`${process.env.PUBLIC_URL}/Icons/fatality_low.svg`}
                              style={{ width: '80px', height: '80px', marginLeft: '5px' }}
                              alt="Low"
                            />
                          )}
                          {event.fatalities > 5 && event.fatalities <= 20 && (
                            <img
                              src={`${process.env.PUBLIC_URL}/Icons/fatality_medium.svg`}
                              style={{ width: '80px', height: '80px', marginLeft: '5px' }}
                              alt="Medium"
                            />
                          )}
                          {event.fatalities > 20 && (
                            <img
                              src={`${process.env.PUBLIC_URL}/Icons/fatality_high.svg`}
                              style={{ width: '80px', height: '80px', marginLeft: '5px' }}
                              alt="High"
                            />
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
          ) : (
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
          ))}
      </MapContainer>

      {/* Selected events sidebar */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.90)',
          padding: '15px',
          borderRadius: '15px',
          boxShadow: '0 0 10px rgba(0,0,0,0.2)',
          height: 'calc(135vh - 500px)',
          width: '20%',
          overflowY: 'auto',
          zIndex: 1000,
          display: selectedMarkers.length > 0 ? 'block' : 'none',
        }}
      >
        <h3 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>
          Selected Events ({visibleSelectedMarkers.length})
        </h3>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em', color: '#666' }}>
              Event Type
            </label>
            <select
              value={selectedSubEventFilter}
              onChange={(e) => setSelectedSubEventFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '0.9em',
                cursor: 'pointer',
                backgroundColor: '#f8f9fa',
              }}
            >
              <option value="all">All Event Types</option>
              {[...new Set(selectedMarkers.map((m) => m.subEventType))].map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em', color: '#666' }}>
              Fatality Level
            </label>
            <select
              value={selectedFatalityFilter}
              onChange={(e) => setSelectedFatalityFilter(e.target.value as FatalityFilter)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '0.9em',
                cursor: 'pointer',
                backgroundColor: '#f8f9fa',
              }}
            >
              <option value="all">All Fatality Levels</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        {visibleSelectedMarkers.map((event, index) => (
          <div
            key={index}
            onClick={() => handleEventClick(event.location.lat, event.location.lng)}
            style={{
              marginBottom: '15px',
              padding: '15px',
              borderRadius: '12px',
              backgroundColor: EVENT_BACKGROUND_COLOR[event.subEventType] ?? '#F5F5F5',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              cursor: 'pointer',
            }}
          >
            <p style={{ fontSize: '1.1em', fontWeight: 'bold', marginBottom: '8px', color: '#2c3e50' }}>
              <strong>Type:</strong> {event.subEventType}
            </p>
            <p style={{ margin: '10px 0', color: '#34495e' }}>
              <strong>Date:</strong> {event.eventDate}
            </p>
            <p style={{ margin: '10px 0', color: '#34495e' }}>
              <strong>Fatalities:</strong> {event.fatalities}
            </p>
            <p style={{ margin: '10px 0', color: '#34495e', lineHeight: '1.4' }}>
              <strong>Notes:</strong> {event.notes}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MapWithGeofencingPage;
