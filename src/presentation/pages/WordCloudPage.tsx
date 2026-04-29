import React from 'react';
import WordCloud from '../components/WordCloud';
import { useConflictData } from '../hooks/useConflictData';

const WordCloudPage: React.FC = () => {
  const { events, loading } = useConflictData();

  if (loading) return <div>Loading...</div>;

  const notes = events.map((e) => e.notes);

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <WordCloud data={notes} />
    </div>
  );
};

export default WordCloudPage;
