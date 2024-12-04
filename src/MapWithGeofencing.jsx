import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, Popup, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import L from 'leaflet';
import 'leaflet-draw';

import ParallelCoordinatesPlot from './Pcp';

import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import MarkerClusterGroup from 'react-leaflet-markercluster';


//Import icons
import fatalityHighIcon from './Icons/fatality_high.svg';
import fatalityMediumIcon from './Icons/fatality_medium.svg';
import fatalityLowIcon from './Icons/fatality_low.svg';
import droneIcon from './Icons/drone.svg';
import artilleryIcon from './Icons/artillery.svg';
import arrestIcon from './Icons/arrest.svg';
import disruptedIcon from './Icons/disrupted.svg';
import protestIcon from './Icons/protest.svg';
import nonStateActorIcon from './Icons/non_state_actor.svg';
import explosiveIcon from './Icons/explosive.svg';
import otherIcon from './Icons/other.svg';
import attackIcon from './Icons/attack.svg';
import grenadeIcon from './Icons/grenade.svg';
import groupIcon from './Icons/group.svg';
import destructionIcon from './Icons/destruction.svg';
import abductionIcon from './Icons/abduction.svg';
import regainsTerritoryIcon from './Icons/regains_territory.svg';
import agreementIcon from './Icons/agreement.svg';
import mobViolenceIcon from './Icons/mob_violence.svg';
import nonViolentIcon from './Icons/non_violent.svg';
import armedClashIcon from './Icons/armed_clash.svg';

const MapWithGeofencing = () => {
  const [markers, setMarkers] = useState([]);
  const [geojsonData, setGeojsonData] = useState(null);
  const [drawEnabled, setDrawEnabled] = useState(false);
  const [selectedMarkers, setSelectedMarkers] = useState([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [displayMode, setDisplayMode] = useState('events'); // 'events' or 'fatalities'
  // timeline slider  
  const [showDateSlider, setShowDateSlider] = useState(false)
  const [dateValue, setDateValue] = useState(0);
  const [allDates, setAllDates] = useState([]);;
  const mapRef = useRef(null);

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

  // Handle rectangle select
  const handleDrawCreated = (e) => {
    const bounds = e.layer.getBounds();
    const selected  = markers.filter((marker) =>
      bounds.contains(L.latLng(marker.lat, marker.lng))
    );
    setSelectedMarkers(selected);
    mapRef.current?.removeLayer(e.layer);
  };

  // Toggle draw control
  const toggleDraw = () => {
    setDrawEnabled(!drawEnabled);
    if (mapRef.current) {
      const map = mapRef.current;
      if (drawEnabled) {
        map.removeControl(map.drawControl);
      } else {
        const drawControl = new L.Control.Draw({
          draw: {
            rectangle: {
              shapeOptions: {
                color: 'red',
                fillColor: 'red',
                fillOpacity: 0.3,
                weight: 1,
              }
            },
            polyline: false,
            polygon: false,
            circle: false,
            marker: false,
            circlemarker: false,
          },
          edit: false,
        });
        map.drawControl = drawControl;
        map.addControl(drawControl);
        map.on('draw:created', handleDrawCreated);
      }
    }
  };
  
  // Cluster for event markers
  const clusterOptions = {
    key: `${displayMode}-${dateValue}`,
    polygonOptions: {
      fillColor: '#ffffff',
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
      fillColor: '#ffffff',
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
      'Air/drone strike': droneIcon,
      'Shelling/artillery/missile attack': artilleryIcon,
      'Arrests': arrestIcon,
      'Disrupted weapons use': disruptedIcon,
      'Peaceful protest': protestIcon,
      'Non-state actor overtakes territory': nonStateActorIcon,
      'Remote explosive/landmine/IED': explosiveIcon,
      'Other': otherIcon,
      'Attack': attackIcon,
      'Grenade': grenadeIcon,
      'Change to group/activity': groupIcon,
      'Looting/property destruction': destructionIcon,
      'Abduction/forced disappearance': abductionIcon,
      'Government regains territory': regainsTerritoryIcon,
      'Agreement': agreementIcon,
      'Mob violence': mobViolenceIcon,
      'Non-violent transfer of territory': nonViolentIcon,
      'Armed clash': armedClashIcon,

      
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
        <button onClick={toggleDraw}>
          {drawEnabled ? 'Disable' : 'Enable'} Rectangle Select
        </button>

        <button 
          onClick={() => setDisplayMode(prev => prev === 'events' ? 'fatalities' : 'events')} 
          style={{ marginLeft: '10px' }}
        >
          Show: {displayMode === 'events' ? 'Events' : 'Fatalities'}
        </button>
        <button 
          onClick={() => setShowDateSlider(!showDateSlider)}
          style={{ marginLeft: '10px' }}
        >
          {showDateSlider ? 'Hide Timeline' : 'Show Timeline'}
        </button>

        {showDateSlider && (
          <div style={{
            marginTop: '10px',
            padding: '15px',
            backgroundColor: 'white',
            borderRadius: '5px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
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
                height: '20px',
                background: '#ddd',
                outline: 'none',
                opacity: '0.7',
                transition: 'opacity .2s'
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
        whenCreated={(mapInstance) => (mapRef.current = mapInstance)}
        maxBounds={[[-90, -180], [90, 180]]}
        minZoom={2}
      >
        <TileLayer
          attribution='Map data © <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* popup window for pcp */}

        {selectedMarkers.length > 0 && (
          <div style={{
            position: 'fixed',
            ...(isMinimized ? {
              bottom: '20px',
              right: '20px',
              transform: 'none',
              width: '200px',
              height: '40px',
            } : {
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
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => setIsMinimized(!isMinimized)}
                style={{
                  padding: '5px 10px',
                  cursor: 'pointer'
                }}
              >
                {isMinimized ? 'Maximize' : 'Minimize'}
              </button>
              <button 
                onClick={() => setSelectedMarkers([])}
                style={{
                  padding: '5px 10px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>            
            {!isMinimized && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                width: '100%',
                height: '100%'
              }}>
                <ParallelCoordinatesPlot data={selectedMarkers} />
              </div>
            )}
          </div>
        )}

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
    {displayMode === 'events' ? (
      <MarkerClusterGroup key={'events-${dateValue}'}
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
                src= {marker.subEventType === 'Air/drone strike' ? droneIcon
                  : marker.subEventType === 'Shelling/artillery/missile attack' ? artilleryIcon
                  : marker.subEventType === 'Armed clash' ? armedClashIcon
                  : marker.subEventType === 'Arrests' ? arrestIcon
                  : marker.subEventType === 'Disrupted weapons use' ? disruptedIcon
                  : marker.subEventType === 'Peaceful protest' ? protestIcon
                  : marker.subEventType === 'Attack' ? attackIcon
                  : marker.subEventType === 'Remote explosive/landmine/IED' ? explosiveIcon
                  : marker.subEventType === 'Other' ? otherIcon
                  : marker.subEventType === 'Change to group/activity' ? groupIcon
                  : marker.subEventType === 'Looting/property destruction' ? destructionIcon
                  : marker.subEventType === 'Abduction/forced disappearance' ? abductionIcon
                  : marker.subEventType === 'Grenade' ? grenadeIcon
                  : marker.subEventType === 'Government regains territory' ? regainsTerritoryIcon
                  : marker.subEventType === 'Non-state actor overtakes territory' ? nonStateActorIcon
                  : marker.subEventType === 'Agreement' ? agreementIcon
                  : marker.subEventType === 'Mob violence' ? mobViolenceIcon
                  : marker.subEventType === 'Non-violent transfer of territory' ? nonViolentIcon
                  : '/default-icon.svg'}
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
                    src={fatalityLowIcon} 
                    style={{ width: '80px', height: '80px', marginLeft: '5px' }}
                    alt="Low"
                    />
                )}
                {marker.fatalities > 5 && marker.fatalities <= 20 && (
                    <img 
                    src={fatalityMediumIcon} 
                    style={{ width: '80px', height: '80px', marginRight: '5px' }}
                    alt="Medium"
                    />
                )}
                {marker.fatalities > 20 && (
                    <img 
                    src={fatalityHighIcon} 
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
      <MarkerClusterGroup key={'fatalities-${dateValue}'}
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
      )}

        {/* rectangle select information */}

      </MapContainer>
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        backgroundColor: 'white',
        // backgroundColor: '#202020',
        // color: 'white',
        padding: '15px',
        borderRadius: '15px',
        boxShadow: '0 0 10px rgba(0,0,0,0.2)',
        maxHeight: '300px',
        overflowY: 'auto',
        zIndex: 1000,
        display: selectedMarkers.length > 0 ? 'block' : 'none'
      }}>
        <h3 style={{ 
          borderBottom: '2px solid #eee',
          paddingBottom: '10px',
          marginBottom: '15px'
        }}>Selected Events ({selectedMarkers.length})</h3>
        {selectedMarkers.map((marker, index) => (
          <div key={index} style={{ 
            marginBottom: '10px', 
            borderBottom: '1px solid #eee', 
            paddingBottom: '5px'
          }}>
            <p><strong>Type:</strong> {marker.subEventType}</p>
            <p><strong>Date:</strong> {marker.event_date}</p>
            <p><strong>Fatalities:</strong> {marker.fatalities}</p>
            <p><strong>Notes:</strong> {marker.notes}</p>
          </div>
        ))}
      </div>      
    </div>
  );
};

export default MapWithGeofencing;
