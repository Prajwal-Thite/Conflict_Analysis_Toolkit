import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ConflictEvent } from '../../domain/entities/ConflictEvent';

interface PixelVisualizationProps {
  data: ConflictEvent[];
}

interface SinglePixelProps {
  data: ConflictEvent[];
  title: string;
}

interface TimelinePoint {
  date: Date;
  fatalities: number;
}

type VisualizationTitle = 'TOTAL FATALITIES' | 'UKRAINE FATALITIES' | 'RUSSIA FATALITIES';

const COLOR_INTERPOLATORS: Record<VisualizationTitle, (t: number) => string> = {
  'TOTAL FATALITIES': d3.interpolateReds,
  'UKRAINE FATALITIES': d3.interpolateGreens,
  'RUSSIA FATALITIES': d3.interpolatePurples,
};

const SinglePixelVisualization: React.FC<SinglePixelProps> = ({ data, title }) => {
  const pixelRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || data.length === 0 || !pixelRef.current) return;

    d3.select(pixelRef.current).selectAll('*').remove();

    const startDate = d3.min(data, (d) => new Date(d.eventDate));
    const endDate = d3.max(data, (d) => new Date(d.eventDate));
    if (!startDate || !endDate) return;

    const totalDays = d3.timeDay.count(startDate, d3.timeDay.offset(endDate, 1));

    const pixelSize = 35;
    const gridWidth = 7;
    const gridHeight = Math.ceil(totalDays / gridWidth);
    const margin = { top: 60, right: 150, bottom: 40, left: 50 };
    const width = gridWidth * pixelSize;
    const height = gridHeight * pixelSize;

    const svg = d3
      .select(pixelRef.current)
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const dateMap = new Map<string, number>();

    let cursor = new Date(startDate);
    while (cursor <= endDate) {
      dateMap.set(cursor.toISOString().split('T')[0], 0);
      cursor = d3.timeDay.offset(cursor, 1);
    }

    data.forEach((d) => {
      const key = new Date(d.eventDate).toISOString().split('T')[0];
      dateMap.set(key, (dateMap.get(key) ?? 0) + (d.fatalities || 0));
    });

    const timelineData: TimelinePoint[] = Array.from(dateMap, ([date, fatalities]) => ({
      date: new Date(date),
      fatalities,
    })).sort((a, b) => a.date.getTime() - b.date.getTime());

    const maxFatalities = d3.max(timelineData, (d) => d.fatalities) ?? 0;

    const interpolator = COLOR_INTERPOLATORS[title as VisualizationTitle] ?? d3.interpolateReds;
    const colorScale = d3.scaleSequential().domain([0, maxFatalities]).interpolator(interpolator);

    svg
      .selectAll<SVGRectElement, TimelinePoint>('rect')
      .data(timelineData)
      .enter()
      .append('rect')
      .attr('x', (_d, i) => (i % gridWidth) * pixelSize)
      .attr('y', (_d, i) => Math.floor(i / gridWidth) * pixelSize)
      .attr('width', pixelSize - 1)
      .attr('height', pixelSize - 1)
      .attr('fill', (d) => colorScale(d.fatalities))
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .on('mouseover', function (event: MouseEvent, d: TimelinePoint) {
        const tooltip = d3
          .select('body')
          .append('div')
          .attr('class', 'pixel-tooltip')
          .style('position', 'absolute')
          .style('background', 'rgba(255,255,255,0.9)')
          .style('padding', '10px')
          .style('border-radius', '5px')
          .style('box-shadow', '0 0 10px rgba(0,0,0,0.1)')
          .style('pointer-events', 'none')
          .style('z-index', 9999);

        tooltip
          .html(
            `<div>
              <strong>Date:</strong> ${new Date(d.date.getTime() + 86400000).toLocaleDateString()}<br>
              <strong>Fatalities:</strong> ${d.fatalities}
            </div>`
          )
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 10}px`);

        d3.select(this).attr('stroke', '#000').attr('stroke-width', 2);
      })
      .on('mouseout', function () {
        d3.selectAll('.pixel-tooltip').remove();
        d3.select(this).attr('stroke', '#fff').attr('stroke-width', 0.5);
      });

    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', -40)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text(title);

    const legendWidth = 20;
    const legendHeight = height;
    const gradientId = `legend-gradient-${title.replace(/\s+/g, '')}`;

    const defs = svg.append('defs');
    const linearGradient = defs
      .append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%')
      .attr('x2', '0%')
      .attr('y1', '100%')
      .attr('y2', '0%');

    [0, 0.25, 0.5, 0.75, 1].forEach((stop) => {
      linearGradient
        .append('stop')
        .attr('offset', `${stop * 100}%`)
        .attr('stop-color', colorScale(stop * maxFatalities));
    });

    const legendGroup = svg.append('g').attr('transform', `translate(${width + 40}, 0)`);

    legendGroup.append('rect').attr('width', legendWidth).attr('height', legendHeight).style('fill', `url(#${gradientId})`);

    const legendScale = d3.scaleLinear().domain([0, maxFatalities]).range([legendHeight, 0]);
    legendGroup
      .append('g')
      .attr('transform', `translate(${legendWidth}, 0)`)
      .call(d3.axisRight(legendScale).ticks(5));

    legendGroup
      .append('text')
      .attr('transform', 'rotate(90)')
      .attr('x', legendHeight / 2)
      .attr('y', -legendWidth - 30)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .text('Fatalities');
  }, [data, title]);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      <svg ref={pixelRef} style={{ width: 'auto', height: 'auto', pointerEvents: 'auto' }} />
    </div>
  );
};

const PixelVisualization: React.FC<PixelVisualizationProps> = ({ data }) => {
  const ukraineData = data.filter((d) => d.iso === 804);
  const russiaData = data.filter((d) => d.iso === 643);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap: '20px',
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }}
    >
      <div style={{ flex: 1, position: 'relative' }}>
        <SinglePixelVisualization data={data} title="TOTAL FATALITIES" />
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <SinglePixelVisualization data={ukraineData} title="UKRAINE FATALITIES" />
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <SinglePixelVisualization data={russiaData} title="RUSSIA FATALITIES" />
      </div>
    </div>
  );
};

export default PixelVisualization;
