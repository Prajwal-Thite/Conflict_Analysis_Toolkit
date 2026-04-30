import React from 'react';
import ThemeRiver from '../components/ThemeRiver';
import { useConflictData } from '../hooks/useConflictData';

const ThemeRiverPage: React.FC = () => {
  const { events, loading } = useConflictData();

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <ThemeRiver data={events} />
    </div>
  );
};

export default ThemeRiverPage;
