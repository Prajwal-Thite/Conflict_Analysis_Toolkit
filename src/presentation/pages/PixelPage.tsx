import React from 'react';
import PixelVisualization from '../components/PixelVisualisation';
import { useConflictData } from '../hooks/useConflictData';

const PixelPage: React.FC = () => {
  const { events, loading } = useConflictData();

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <PixelVisualization data={events} />
    </div>
  );
};

export default PixelPage;
