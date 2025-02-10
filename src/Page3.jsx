import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import 'leaflet/dist/leaflet.css';

const HeatmapLayer = ({ data }) => {
  const map = useMap();
  const legend = L.control({ position: 'bottomright' });

  legend.onAdd = function () {
    const div = L.DomUtil.create('div', 'info legend');
    div.style.backgroundColor = 'white';
    div.style.padding = '10px';
    div.style.borderRadius = '5px';
    div.style.border = '2px solid rgba(0,0,0,0.2)';

    const scales = ['Regional', 'National', 'Other'];
    const colors = ['#1a9850', '#d73027', '#00008B'];

    div.innerHTML += '<h4>Source Scale</h4>';
    
    scales.forEach((scale, i) => {
      div.innerHTML += 
        `<div style="margin: 5px;">
          <i style="background: ${colors[i]}; 
                   width: 15px; 
                   height: 15px; 
                   display: inline-block;
                   border-radius: 50%;
                   margin-right: 5px;"></i>
          ${scale}
        </div>`;
    });

    return div;
  };

  // Existing heatmap logic
  const sourceScaleMapping = {
    'National': 'National',
    'National-Regional': 'National',    
    'New media-National': 'National',
    'Subnational-National': 'National',
    'Other-National': 'National',    
    'Other': 'Other',
    'Subnational': 'Other',
    'Other-Subnational': 'Other',
    'New media': 'Other',
    'Other-New media': 'Other',    
    'Regional': 'Regional',
    'Other-Regional': 'Regional',
    'New media-Regional': 'Regional',
  };

  const getIntensity = (scale) => {
    if (!scale) return 0.2;
    const mappedCategory = sourceScaleMapping[scale] || 'Other';
    switch(mappedCategory) {
      case 'National': return 1.0;
      case 'Regional': return 0.6;
      default: return 0.3;
    }
  };

  const aggregatePoints = (data) => {
    const locationMap = new Map();
    data.forEach(point => {
      const key = `${point.lat},${point.lng}`;
      if (!locationMap.has(key)) {
        locationMap.set(key, {
          lat: point.lat,
          lng: point.lng,
          scales: new Map()
        });
      }
      const location = locationMap.get(key);
      const currentScale = sourceScaleMapping[point.source_scale] || 'Other';
      location.scales.set(currentScale, (location.scales.get(currentScale) || 0) + 1);
    });

    return Array.from(locationMap.values()).map(location => {
      let maxCount = 0;
      let dominantScale = 'Other';
      location.scales.forEach((count, scale) => {
        if (count > maxCount) {
          maxCount = count;
          dominantScale = scale;
        }
      });
      return [location.lat, location.lng, getIntensity(dominantScale)];
    });
  };

  useEffect(() => {
    if (!data?.length) return;

    const aggregatedPoints = aggregatePoints(data);
    const heatLayer = L.heatLayer(aggregatedPoints, {
      radius: 25,
      blur: 15,
      minOpacity: 0.5,
      maxZoom: 10,
      minZoom: 2,
      gradient: {
        0.3: '#00008B',
        1.0: '#d73027',
        0.6: '#1a9850'
      }
    }).addTo(map);

    legend.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
      map.removeControl(legend);
    };
  }, [map, data]);

  return null;
};

const IntegratedHeatmap = () => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [geojsonData, setGeojsonData] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [dateValue, setDateValue] = useState(0);
  const [allDates, setAllDates] = useState([]);
  const [showDateSlider, setShowDateSlider] = useState(false);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
      .then((response) => response.json())
      .then((data) => setGeojsonData(data));
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch(`${process.env.PUBLIC_URL}/complete_dataset.json`);
      if (!response.ok) {
        const ghResponse = await fetch('https://prajwal-thite.github.io/Conflict_Analysis_Toolkit/complete_dataset.json');
        return await ghResponse.json();
      }
      return await response.json();
    } catch (error) {
      console.log('Error loading data:', error);
    }
  };

  useEffect(() => {
    if (geojsonData) {
      fetchData().then((jsonData) => {
        if (jsonData && Array.isArray(jsonData)) {
          const points = jsonData.slice(0, 5000).map(event => ({
            lat: event.latitude,
            lng: event.longitude,
            event_date: event.event_date,
          }));

          const uniqueDates = [...new Set(points.map(p => p.event_date))]
            .sort((a, b) => new Date(a) - new Date(b));
          setAllDates(uniqueDates);
          setDateValue(0);
          setMarkers(points);
        }
      });
    }
  }, [geojsonData]);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getFilteredMarkers = () => {
    if (!showDateSlider || allDates.length === 0) return markers;
    const selectedDate = allDates[dateValue];
    return markers.filter(marker => marker.event_date === selectedDate);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px', background: '#f0f0f0' }}>
        <button
          onClick={() => setShowDateSlider(!showDateSlider)}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            border: '1px solid #e1e4e8',
            background: 'white',
            color: '#24292e',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          {showDateSlider ? 'Hide Timeline' : 'Show Timeline'}
        </button>

        {showDateSlider && (
          <div style={{
            marginTop: '10px',
            padding: '15px',
            backgroundColor: 'white',
            borderRadius: '20px',
            border: '1px solid #e1e4e8',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '8px', fontSize: '14px', color: '#24292e' }}>
              {allDates[dateValue] && formatDate(allDates[dateValue])}
            </div>
            <input
              type="range"
              min={0}
              max={allDates.length - 1}
              value={dateValue}
              onChange={(e) => setDateValue(parseInt(e.target.value))}
              style={{
                width: '100%',
                height: '4px',
                borderRadius: '2px',
                cursor: 'pointer'
              }}
            />
          </div>
        )}
      </div>

      <MapContainer
        ref={mapRef}
        center={[48.5, 37.5]}
        zoom={5}
        style={{ flex: 1 }}
        whenReady={(map) => {
          setMap(map.target);
          mapRef.current = map.target;
        }}
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
              const country = feature.properties.ADMIN;
              return country === 'Ukraine' || country === 'Russia'
                ? { 
                    color: '#2b2b2b',
                    weight: 2,
                    fillOpacity: 0,
                    dashArray: 'none'
                  }
                : {
                    color: 'transparent',
                    weight: 0,
                    fillOpacity: 0
                  };
            }}
          />
        )}
        <HeatmapLayer data={getFilteredMarkers()} />
      </MapContainer>
    </div>
  );
};

export default IntegratedHeatmap;
