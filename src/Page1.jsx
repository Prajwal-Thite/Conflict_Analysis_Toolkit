import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, Popup, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import L from 'leaflet';
import 'leaflet-draw';

import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import MarkerClusterGroup from 'react-leaflet-markercluster';

const MapWithGeofencing_single = () => {
  const [markers, setMarkers] = useState([]);
  const [geojsonData, setGeojsonData] = useState(null);
  const [displayMode, setDisplayMode] = useState('events'); // 'events' or 'fatalities'
  // timeline slider  
  const [showDateSlider, setShowDateSlider] = useState(false)
  const [dateValue, setDateValue] = useState(0);
  const [allDates, setAllDates] = useState([]);;
  const mapRef = useRef(null);
  //marker reference on map
  const [map, setMap] = useState(null);

  // Fetch GeoJSON data
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
      .then((response) => response.json())
      .then((data) => setGeojsonData(data));
  }, []);

  // Fetch events data
  const fetchData = async () => {
    try {
      // Try local path first
      const response = await fetch(`${process.env.PUBLIC_URL}/complete_dataset.json`);
      if (!response.ok) {
        // If local fails, try GitHub Pages URL
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
          // Get n points from the dataset
          const first100Events = jsonData.slice(0, 5000);
          const points = first100Events.map(event => ({
            lat: event.latitude,
            lng: event.longitude,
            color: event.iso === 643 ? 'red' : event.iso === 804 ? 'black' : 'gray',
            event_type: event.event_type,
            subEventType: event.sub_event_type,
            fatalities: event.fatalities,
            notes: event.notes,
            fatalityLevel: getFatalityCategory(event.fatalities),
            actor1: event.actor1,
            assoc_actor_1: event.assoc_actor_1,
            inter1: event.inter1,
            actor2: event.actor2,
            assoc_actor_2: event.assoc_actor_2,
            inter2: event.inter2,
            interaction: event.interaction,
            event_date: event.event_date,
            sub_event_type_code: event.sub_event_type_code,
            iso: event.iso,
          }));          

          // Get unique dates and sort them chronologically
          const uniqueDates = [...new Set(points.map(p => p.event_date))]
            .sort((a, b) => new Date(a) - new Date(b));
          setAllDates(uniqueDates);
          setDateValue(0);

          setMarkers(points);
        }
        });
      }    
  }, [geojsonData])
  
  // Cluster for event markers
  const clusterOptions = {
    key: `${displayMode}-${dateValue}`,
    polygonOptions: {
      fillColor: '#f5f5f5',
      color: '#000000',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.5
    },
    disableClusteringAtZoom: 19,
    spiderfyDistanceMultiplier: 2,
    chunkedLoading :true,
    maxClusterRadius:50,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover:true,
    removeOutsideVisibleBounds: true,
    animate: true,    
  };
  
  // Cluster for fatality markers
  const clusterOptions2 = {
    key: `${displayMode}-${dateValue}`,
    polygonOptions: {
      fillColor: '#f5f5f5',
      color: '#000000',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.5
    },
    spiderfyDistanceMultiplier: 2,    
    chunkedLoading: true,
    maxClusterRadius: 50,
    showCoverageOnHover: true,
    spiderfyOnMaxZoom: true,
    removeOutsideVisibleBounds: true,
    disableClusteringAtZoom: 19,
    animate: true,
    iconCreateFunction: (cluster) => {
      const markers = cluster.getAllChildMarkers();
      const totalFatalities = markers.reduce((sum, marker) => {
        return sum + (marker.options.properties?.fatalities || 0);
      }, 0);

      const childCount = totalFatalities;
      let c = ' marker-cluster-';
      if (childCount < 10) {
        c += 'small';
      } else if (childCount < 100) {
        c += 'medium';
      } else {
        c += 'large';
      }
  
      return new L.DivIcon({
        html: '<div><span>' + totalFatalities + '</span></div>',
        className: 'marker-cluster' + c,
        iconSize: new L.Point(40, 40)
      });
    }
  };
  

  // Fatality levels
  const getFatalityCategory = (fatalities) => {
    if (fatalities <= 5) return 'Low';
    if (fatalities <= 20) return 'Medium';
    if (fatalities > 20) return 'High';
    return 'Unknown';
  };

  //Icons
  const getEventIcon = (subEventType, color) => {
    const iconMapping = {
      'Air/drone strike': `${process.env.PUBLIC_URL}/Icons/drone.svg`,
      'Shelling/artillery/missile attack': `${process.env.PUBLIC_URL}/Icons/artillery.svg`,
      'Arrests': `${process.env.PUBLIC_URL}/Icons/arrest.svg`,
      'Disrupted weapons use': `${process.env.PUBLIC_URL}/Icons/disrupted.svg`,
      'Peaceful protest': `${process.env.PUBLIC_URL}/Icons/protest.svg`,
      'Non-state actor overtakes territory': `${process.env.PUBLIC_URL}/Icons/non_state_actor.svg`,
      'Remote explosive/landmine/IED': `${process.env.PUBLIC_URL}/Icons/explosive.svg`,
      'Other': `${process.env.PUBLIC_URL}/Icons/other.svg`,
      'Attack': `${process.env.PUBLIC_URL}/Icons/attack.svg`,
      'Grenade': `${process.env.PUBLIC_URL}/Icons/grenade.svg`,
      'Change to group/activity': `${process.env.PUBLIC_URL}/Icons/group.svg`,
      'Looting/property destruction': `${process.env.PUBLIC_URL}/Icons/destruction.svg`,
      'Abduction/forced disappearance': `${process.env.PUBLIC_URL}/Icons/abduction.svg`,
      'Government regains territory': `${process.env.PUBLIC_URL}/Icons/regains_territory.svg`,
      'Agreement': `${process.env.PUBLIC_URL}/Icons/agreement.svg`,
      'Mob violence': `${process.env.PUBLIC_URL}/Icons/mob_violence.svg`,
      'Non-violent transfer of territory': `${process.env.PUBLIC_URL}/Icons/non_violent.svg`,
      'Armed clash': `${process.env.PUBLIC_URL}/Icons/armed_clash.svg`,
    };
  
    return L.divIcon({
      html: `<img 
        src="${iconMapping[subEventType] || '/default-icon.svg'}" 
        style="width: 25px; height: 25px; filter: ${
          color === 'red' 
            ? 'invert(27%) sepia(51%) saturate(2878%) hue-rotate(346deg) brightness(104%) contrast(97%)'
            : color === 'black' 
            ? 'brightness(0%)'
            : 'invert(50%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%)'
        };"
      />`,
      className: 'custom-div-icon',
      iconSize: [25, 25]
    });
  };

  // Filter markers by date
  const getFilteredMarkers = () => {
    if (!showDateSlider || allDates.length === 0) return markers;
    const selectedDate = allDates[dateValue];
    return markers.filter(marker => marker.event_date === selectedDate);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px', background: '#f0f0f0' }}>
        <div style={{ display: 'flex', gap: '10px' }}>

          <button
            onClick={() => setDisplayMode(prev => {
              if (prev === 'events') return 'fatalities';
              if (prev === 'fatalities') return 'none';
              return 'events';
            })}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: '1px solid #e1e4e8',
              background: 'white',
              color: '#24292e',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Show: {displayMode === 'events' ? 'Events' : displayMode === 'fatalities' ? 'Fatalities' : 'None'}
          </button>

          <button
            onClick={() => setShowDateSlider(!showDateSlider)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: '1px solid #e1e4e8',
              background: 'white',
              color: '#24292e',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {showDateSlider ? 'Hide Timeline' : 'Show Timeline'}
          </button>

        </div>

        {showDateSlider && (
          <div style={{
            marginTop: '10px',
            padding: '15px',
            backgroundColor: 'white',
            borderRadius: '20px',
            border: '1px solid #e1e4e8',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ 
              textAlign: 'center', 
              marginBottom: '8px',
              fontSize: '14px',
              color: '#24292e'
            }}>
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
        // for event click feature
        whenReady={(map) => {
          setMap(map.target);
          mapRef.current = map.target;
        }}
        maxBounds={[[-90, -180], [90, 180]]}
        minZoom={2}
      >
        <TileLayer
            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />                

        {/* Coloring the country regions */}

        {geojsonData && (
          <GeoJSON
            data={geojsonData}
            style={(feature) => {
              const country = feature.properties.ADMIN;
              return country === 'Ukraine'
                ? { color: 'black', weight: 1, fillColor: 'yellow', fillOpacity: 0.4, zIndex: 1, dashArray: '5, 5' }
                : country === 'Russia'
                ? { color: 'gray', weight: 2, fillColor: 'blue', fillOpacity: 0.4, zIndex: 1, dashArray: '5, 5' }
                : { color: 'gray', fillColor: 'lightgray', fillOpacity: 0.2, zIndex: 1 };
            }}     
          />
        )}

      {/* Marker Clustering */}
    {displayMode !== 'none' && (
      displayMode === 'events' ? (
        <MarkerClusterGroup key={`events-${dateValue}`}
          {...clusterOptions}                          
        >
          {/* Bitmarkers */}

          {getFilteredMarkers().map((marker, index) => (
            <Marker

            // for custom markers******************************************
              key={`${index}-${dateValue}`}
              position={[marker.lat, marker.lng]}            
              icon={getEventIcon(marker.subEventType, marker.color)}    
              zIndex={1000} // Higher z-index value to ensure markers appear on top
            >
              {/* Pop up box over the marker */}

              <Popup>
              <div style={{ 
                  fontFamily: 'math', 
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',                
              }}>

              <div style={{ position: 'relative', width: '60px', height: '60px' }}>
                  <div style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      backgroundColor: '#A9A9A9',
                      zIndex: 1
                  }} />

                  {/* popupbox image */}

                  <img 
                      src={`${process.env.PUBLIC_URL}${
                        marker.subEventType === 'Air/drone strike' ? '/Icons/drone.svg'
                        : marker.subEventType === 'Shelling/artillery/missile attack' ? '/Icons/artillery.svg'
                        : marker.subEventType === 'Armed clash' ? '/Icons/armed_clash.svg'
                        : marker.subEventType === 'Arrests' ? '/Icons/arrest.svg'
                        : marker.subEventType === 'Disrupted weapons use' ? '/Icons/disrupted.svg'
                        : marker.subEventType === 'Peaceful protest' ? '/Icons/protest.svg'
                        : marker.subEventType === 'Attack' ? '/Icons/attack.svg'
                        : marker.subEventType === 'Remote explosive/landmine/IED' ? '/Icons/explosive.svg'
                        : marker.subEventType === 'Other' ? '/Icons/other.svg'
                        : marker.subEventType === 'Change to group/activity' ? '/Icons/group.svg'
                        : marker.subEventType === 'Looting/property destruction' ? '/Icons/destruction.svg'
                        : marker.subEventType === 'Abduction/forced disappearance' ? '/Icons/abduction.svg'
                        : marker.subEventType === 'Grenade' ? '/Icons/grenade.svg'
                        : marker.subEventType === 'Government regains territory' ? '/Icons/regains_territory.svg'
                        : marker.subEventType === 'Non-state actor overtakes territory' ? '/Icons/non_state_actor.svg'
                        : marker.subEventType === 'Agreement' ? '/Icons/agreement.svg'
                        : marker.subEventType === 'Mob violence' ? '/Icons/mob_violence.svg'
                        : marker.subEventType === 'Non-violent transfer of territory' ? '/Icons/non_violent.svg'
                        : '/default-icon.svg'}`}
                    alt={marker.subEventType || 'Event icon'}
                  style={{ 
                      width: '60px', 
                      height: '60px', 
                      // borderRadius: '50%',
                      position: 'relative',
                      zIndex: 2,                    
                      filter: marker.color === 'red' 
                          ? 'invert(27%) sepia(51%) saturate(2878%) hue-rotate(346deg) brightness(104%) contrast(97%)'
                          : marker.color === 'black' 
                          ? 'brightness(0%)'
                          : 'invert(50%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%)', // for gray                    
                  }} 
                  />
                  </div>

                  {/* popup box information */}
                  
                  <div>
                  <div style={{ color: '#333', marginBottom: '20px' }}>
                      <strong>Sub Event Type:</strong> {marker.subEventType}
                  </div>
                  <div style={{ color: '#333', marginBottom: '0.5px' }}>
                      <strong>Date:</strong> {marker.event_date}
                  </div>
                  <div style={{ color: '#333', marginBottom: '0px', display: 'flex', alignItems: 'center' }}>
                  <strong>Fatalities: </strong> {marker.fatalities}
                  {marker.fatalities <= 5 && (
                      <img 
                      src={`${process.env.PUBLIC_URL}/Icons/fatality_low.svg`} 
                      style={{ width: '80px', height: '80px', marginLeft: '5px' }}
                      alt="Low"
                      />
                  )}
                  {marker.fatalities > 5 && marker.fatalities <= 20 && (
                      <img 
                      src={`${process.env.PUBLIC_URL}/Icons/fatality_medium.svg`} 
                      style={{ width: '80px', height: '80px', marginRight: '5px' }}
                      alt="Medium"
                      />
                  )}
                  {marker.fatalities > 20 && (
                      <img 
                      src={`${process.env.PUBLIC_URL}/Icons/fatality_high.svg`} 
                      style={{ width: '80px', height: '80px', marginLeft: '5px' }}
                      alt="High"
                      />
                  )}
                  </div>
                  <div style={{ color: '#333' }}>
                      <strong>Notes:</strong> {marker.notes}
                  </div>
                  </div>                
              </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      ):(
        <MarkerClusterGroup key={`fatalities-${dateValue}`}
            {...clusterOptions2}
          >
            {getFilteredMarkers().map((marker, index) => (
              <Marker
                key={`${index}-${dateValue}`}
                position={[marker.lat, marker.lng]}
                properties={{ fatalities: marker.fatalities }}
                eventHandlers={{
                  add: (e) => {
                    e.target.options.totalFatalities = marker.fatalities;
                  }
                }}
                icon={L.divIcon({
                  html: `<div style="
                    background-color: ${marker.color};
                    color: white;
                    border-radius: 50%;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                  ">${marker.fatalities}</div>`,
                  className: ''
                })}
              >
                <Popup>
                  <div>
                    <h3>Fatalities: {marker.fatalities}</h3>
                    <p>Event Type: {marker.subEventType}</p>
                    <p>Date: {marker.event_date}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
          )
        )}

        {/* rectangle select information */}

      </MapContainer>  
    </div>
  );
};

export default MapWithGeofencing_single;
