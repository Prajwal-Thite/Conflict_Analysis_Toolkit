import React from 'react';
import ParallelCoordinatesPlot from '../components/Pcp';
import { useConflictData } from '../hooks/useConflictData';

const ParallelCoordinatesPage: React.FC = () => {
  const { events, loading } = useConflictData();

  if (loading) return <div>Loading...</div>;

  return <ParallelCoordinatesPlot data={events} />;
};

export default ParallelCoordinatesPage;
