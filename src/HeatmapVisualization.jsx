import React from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

const HeatmapVisualization = ({ data }) => {
  const map = useMap();
  const legend = L.control({ position: 'bottomright' });

  const sourceScaleMapping = {
    // National 
    'National': 'National',
    'National-Regional': 'National',    
    'New media-National': 'National',
    'Subnational-National': 'National',
    'Other-National': 'National',    
    
    // Other 
    'Other': 'Other',
    'Subnational': 'Other',
    'Other-Subnational': 'Other',
    'New media': 'Other',
    'Other-New media': 'Other',    
    
    // Regional 
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

      return [
        location.lat,
        location.lng,
        getIntensity(dominantScale)
      ];
    });
  };

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

  React.useEffect(() => {
    if (!data || !data.length) return;

    const aggregatedPoints = aggregatePoints(data);
    const heatLayer = L.heatLayer(aggregatedPoints, {
      radius: 25,
      blur: 15,
      minOpacity: 0.5,
      maxZoom: 18,
      minZoom: 2,
      gradient: {
        0.3: '#00008B',  // Other 
        1.0: '#d73027',  // National 
        0.6: '#1a9850'   // Regional 
      }
    }).addTo(map);

    legend.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
      map.removeControl(legend);
    };
  }, [map, data,]);

  return null;
};

export default HeatmapVisualization;
