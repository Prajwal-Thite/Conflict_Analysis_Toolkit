import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';

interface WordCloudProps {
  data: (string | null)[];
}

interface WordDatum {
  text: string;
  size: number;
  x?: number;
  y?: number;
}

const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'were', 'what']);

const WordCloud: React.FC<WordCloudProps> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    d3.select(containerRef.current).selectAll('*').remove();

    const words = data
      .filter((note): note is string => Boolean(note))
      .flatMap((note) =>
        note
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .replace(/\d+/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .split(' ')
      )
      .filter((word) => word.length > 3 && !STOP_WORDS.has(word));

    const wordCount: Record<string, number> = {};
    words.forEach((word) => {
      wordCount[word] = (wordCount[word] ?? 0) + 1;
    });

    const width = 1000;
    const height = 600;

    const totalWords = Object.keys(wordCount).length;
    const scaleFactor = Math.sqrt((width * height) / totalWords) * 0.32;

    const wordData: WordDatum[] = Object.entries(wordCount)
      .map(([text, size]) => ({
        text,
        size: Math.min(Math.pow(size, 0.305) * scaleFactor, height / 6),
      }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 50);

    const layout = cloud<WordDatum>()
      .size([width, height])
      .words(wordData)
      .padding(5)
      .rotate(() => 0)
      .fontSize((d) => Math.min(d.size ?? 0, 60))
      .spiral('archimedean')
      .text((d) => d.text ?? '')
      .random(() => 0.5)
      .on('end', draw);

    function draw(drawnWords: WordDatum[]): void {
      const svg = d3
        .select(containerRef.current)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('border', '1px solid black')
        .append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);

      svg
        .selectAll<SVGTextElement, WordDatum>('text')
        .data(drawnWords)
        .enter()
        .append('text')
        .style('font-size', (d) => `${d.size}px`)
        .style('font-family', 'Impact')
        .style('fill', (_d, i) => d3.schemeCategory10[i % 10])
        .attr('text-anchor', 'middle')
        .attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
        .text((d) => d.text ?? '');
    }

    layout.start();
  }, [data]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        maxWidth: '1000px',
        height: '600px',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        border: '2px solid #ccc',
        padding: '20px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
      }}
    />
  );
};

export default WordCloud;
