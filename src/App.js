import React from 'react';
import { HashRouter  as Router, Routes, Route } from 'react-router-dom';
import MapWithGeofencing from './MapWithGeofencing';
import Page1 from './Page1';
import Page2 from './Page2';
import Page3 from './Page3';
import Page4 from './Page4';
import Page5 from './Page5';
import Page6 from './Page6';

function App() {
  return (
    <Router basename="/Conflict_Analysis_Toolkit">
      <Routes>
        <Route path="/" element={<MapWithGeofencing />} />
        <Route path="/geomap" element={<Page1 />} />
        <Route path="/pcp" element={<Page2 />} />
        <Route path="/heatmap" element={<Page3 />} />
        <Route path="/themeriver" element={<Page4 />} />
        <Route path="/pixel" element={<Page5 />} />
        <Route path="/wordcloud" element={<Page6 />} />
      </Routes>
    </Router>
  );
}

export default App;

{/* <div style={{ height: '100vh', width: '100%' }}>
<Page6 />
</div> */}
