import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MapWithGeofencing from './MapWithGeofencing';
import MapWithGeofencing_single from './Page1';
import ParallelCoordinatesPlot from './Page2';
import IntegratedHeatmap from './Page3';
import ThemeRiver from './Page4';
import PixelVisualization from './Page5';
import WordCloud from './Page6';

function App() {
  return (
    <Router basename="/Conflict_Analysis_Toolkit">
      <Routes>
        <Route path="/" element={<MapWithGeofencing />} />
        <Route path="/geomap" element={<MapWithGeofencing_single />} />
        <Route path="/pcp" element={<ParallelCoordinatesPlot />} />
        <Route path="/heatmap" element={<IntegratedHeatmap />} />
        <Route path="/themeriver" element={<ThemeRiver />} />
        <Route path="/pixel" element={<PixelVisualization />} />
        <Route path="/wordcloud" element={<WordCloud />} />
      </Routes>
    </Router>
  );
}

export default App;

{/* <div style={{ height: '100vh', width: '100%' }}>
<Page6 />
</div> */}
