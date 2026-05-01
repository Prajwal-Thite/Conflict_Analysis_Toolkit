import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

const GUIDE_ITEMS = [
  {
    key: 'rectangleSelect',
    label: 'Rectangle Select',
    description: 'Draw a rectangle on the map to select all conflict events within that area for analysis.',
  },
  {
    key: 'displayMode',
    label: 'Show: Events / Fatalities / None',
    description: 'Toggle markers between event type icons, fatality count bubbles, or hide all markers.',
  },
  {
    key: 'timeline',
    label: 'Show / Hide Timeline',
    description: 'Reveal a date slider to filter and step through events day by day.',
  },
  {
    key: 'heatmap',
    label: 'Show / Hide Heatmap',
    description: 'Overlay a density heatmap showing where conflict events are most concentrated.',
  },
  {
    key: 'eventInfo',
    label: 'Event Info',
    description: 'Open a Theme River chart showing how event types distribute and change over time.',
  },
];

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
  const [showTooltips, setShowTooltips] = useState<boolean>(true);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({
    rectangleSelect: null, displayMode: null, timeline: null, heatmap: null, eventInfo: null,
  });
  const listItemRefs = useRef<Record<string, HTMLDivElement | null>>({
    rectangleSelect: null, displayMode: null, timeline: null, heatmap: null, eventInfo: null,
  });
  type BtnHighlight = { key: string; left: number; top: number; width: number; height: number };
  const [btnHighlights, setBtnHighlights] = useState<BtnHighlight[]>([]);

  useEffect(() => {
    if (!showTooltips) return;
    const id = setTimeout(() => {
      requestAnimationFrame(() => {
        const highlights = GUIDE_ITEMS.map(({ key }) => {
          const r = btnRefs.current[key]?.getBoundingClientRect();
          if (!r) return null;
          return { key, left: r.left, top: r.top, width: r.width, height: r.height };
        }).filter((v): v is BtnHighlight => v !== null);
        setBtnHighlights(highlights);
      });
    }, 80);
    return () => clearTimeout(id);
  }, [showTooltips]);

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
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            ref={(el) => { btnRefs.current.rectangleSelect = el; }}
            onClick={toggleDraw}
            style={BTN_STYLE}
          >
            {drawEnabled ? 'Disable' : 'Enable'} Rectangle Select
          </button>

          <button
            ref={(el) => { btnRefs.current.displayMode = el; }}
            onClick={() =>
              setDisplayMode((prev) =>
                prev === 'events' ? 'fatalities' : prev === 'fatalities' ? 'none' : 'events'
              )
            }
            style={BTN_STYLE}
          >
            Show: {displayMode === 'events' ? 'Events' : displayMode === 'fatalities' ? 'Fatalities' : 'None'}
          </button>

          <button
            ref={(el) => { btnRefs.current.timeline = el; }}
            onClick={() => setShowDateSlider((v) => !v)}
            style={BTN_STYLE}
          >
            {showDateSlider ? 'Hide Timeline' : 'Show Timeline'}
          </button>

          <button
            ref={(el) => { btnRefs.current.heatmap = el; }}
            onClick={() => setShowHeatmap((v) => !v)}
            style={BTN_STYLE}
          >
            {showHeatmap ? 'Hide Heatmap' : 'Show Heatmap'}
          </button>

          <button
            ref={(el) => { btnRefs.current.eventInfo = el; }}
            onClick={() => setShowEventInfo((v) => !v)}
            style={BTN_STYLE}
          >
            Event Info
          </button>

          <button
            onClick={() => setShowTooltips(true)}
            title="Show toolbar guide"
            style={{
              ...BTN_STYLE,
              padding: '0',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: '#E8F4FD',
              color: '#0969DA',
              border: '1px solid #BAD8FB',
            }}
          >
            ⓘ
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
                  properties={{ fatalities: event.fatalities }}
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

      {/* Portals — rendered into document.body so position:fixed is relative to the
          viewport and Leaflet's DOM cannot intercept pointer events */}

      {selectedMarkers.length > 0 && !showPixelPopup && createPortal(
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
        </div>,
        document.body
      )}

      {showPixelPopup && selectedMarkers.length > 0 && createPortal(
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
        </div>,
        document.body
      )}

      {showWordCloud && selectedMarkers.length > 0 && createPortal(
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
        </div>,
        document.body
      )}

      {showTooltips && createPortal(
        <>
          {/* Dimmed backdrop — click to dismiss */}
          <div
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.22)',
              zIndex: 9997,
            }}
            onClick={() => setShowTooltips(false)}
          />

          {/* Highlighted button rings + numbered badges */}
          {btnHighlights.map(({ key, left, top, width, height }, i) => (
            <React.Fragment key={key}>
              {/* Glowing ring around the button */}
              <div
                style={{
                  position: 'fixed',
                  left: left - 4,
                  top: top - 4,
                  width: width + 8,
                  height: height + 8,
                  borderRadius: '24px',
                  border: '2px solid #0969DA',
                  boxShadow: '0 0 0 4px rgba(9,105,218,0.18)',
                  pointerEvents: 'none',
                  zIndex: 9998,
                }}
              />
              {/* Numbered badge at top-left of button */}
              <div
                style={{
                  position: 'fixed',
                  left: left - 9,
                  top: top - 9,
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: '#0969DA',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  zIndex: 9999,
                  boxShadow: '0 1px 4px rgba(9,105,218,0.5)',
                }}
              >
                {i + 1}
              </div>
            </React.Fragment>
          ))}

          {/* Guide modal */}
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '360px',
              backgroundColor: 'white',
              borderRadius: '16px',
              border: '1px solid #e1e4e8',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              zIndex: 10000,
              padding: '20px 22px 14px',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#24292e' }}>Toolbar Guide</span>
              <button
                onClick={() => setShowTooltips(false)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '20px', color: '#57606a', padding: '0 2px', lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {/* Item list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {GUIDE_ITEMS.map(({ key, label, description }, i) => (
                <div
                  key={key}
                  ref={(el) => { listItemRefs.current[key] = el; }}
                  style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}
                >
                  <div
                    style={{
                      width: '20px', height: '20px', borderRadius: '50%',
                      backgroundColor: '#0969DA', color: 'white',
                      fontSize: '11px', fontWeight: '700',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, marginTop: '1px',
                    }}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#24292e', marginBottom: '2px' }}>
                      {label}
                    </div>
                    <div style={{ fontSize: '12px', color: '#57606a', lineHeight: '1.4' }}>
                      {description}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ marginTop: '14px', borderTop: '1px solid #f0f0f0', paddingTop: '10px', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: '#8b949e' }}>
                Click backdrop or × to dismiss
              </span>
            </div>
          </div>
        </>,
        document.body
      )}

      {showEventInfo && createPortal(
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
        </div>,
        document.body
      )}
    </div>
  );
};

export default MapWithGeofencingPage;
