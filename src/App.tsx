import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MapWithGeofencing from './MapWithGeofencing';
import GeoMapPage from './presentation/pages/GeoMapPage';
import ParallelCoordinatesPage from './presentation/pages/ParallelCoordinatesPage';
import HeatmapPage from './presentation/pages/HeatmapPage';
import ThemeRiverPage from './presentation/pages/ThemeRiverPage';
import PixelPage from './presentation/pages/PixelPage';
import WordCloudPage from './presentation/pages/WordCloudPage';

function App(): React.JSX.Element {
  return (
    <Router basename="/Conflict_Analysis_Toolkit">
      <Routes>
        <Route path="/" element={<MapWithGeofencing />} />
        <Route path="/geomap" element={<GeoMapPage />} />
        <Route path="/pcp" element={<ParallelCoordinatesPage />} />
        <Route path="/heatmap" element={<HeatmapPage />} />
        <Route path="/themeriver" element={<ThemeRiverPage />} />
        <Route path="/pixel" element={<PixelPage />} />
        <Route path="/wordcloud" element={<WordCloudPage />} />
      </Routes>
    </Router>
  );
}

export default App;
