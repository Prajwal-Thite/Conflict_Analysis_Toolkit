import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import ParallelSets from './ParallelSets';
import { ConflictEvent } from '../../domain/entities/ConflictEvent';

interface ParallelCoordinatesPlotProps {
  data: ConflictEvent[];
}

type PcpDim = 'subEventType' | 'inter1' | 'inter2' | 'fatalities';

const DIMENSIONS: PcpDim[] = ['subEventType', 'inter1', 'inter2', 'fatalities'];

const AXIS_LABELS: Record<PcpDim, string> = {
  subEventType: 'SUB EVENT',
  inter1: 'ACTOR 1',
  inter2: 'ACTOR 2',
  fatalities: 'FATALITIES',
};

const INTER_CODES: Record<number, string> = {
  1: 'State Forces',
  2: 'Rebel Groups',
  3: 'Political Militias',
  4: 'Identity Militias',
  5: 'Rioters',
  6: 'Protesters',
  7: 'Civilians',
  8: 'External / Other Forces',
};

const SUB_EVENT_ORDER: string[] = [
  'regains territory', 'Agreement', 'Arrests', 'Disrupted weapons', 'Change to group',
  'Armed clash', 'Looting', 'Other', 'Attack', 'Remote explosive', 'Grenade',
  'Mob violence', 'Air/drone strike', 'Shelling/artillery/missile attack',
  'Abduction', 'Non', 'transfer of territory', 'Peaceful protest',
];

function getDimValue(d: ConflictEvent, dim: PcpDim): string | number {
  switch (dim) {
    case 'subEventType': return d.subEventType;
    case 'inter1': return d.actor1.interCode;
    case 'inter2': return d.actor2?.interCode ?? 0;
    case 'fatalities': return d.fatalities;
  }
}

function sortSubEvents(a: string, b: string): number {
  for (const keyword of SUB_EVENT_ORDER) {
    const aHas = a.includes(keyword);
    const bHas = b.includes(keyword);
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
  }
  return a.localeCompare(b);
}

type YScale = d3.ScalePoint<string> | d3.ScaleLinear<number, number>;

function applyYScale(scale: YScale, val: string | number): number {
  return (scale as d3.ScaleLinear<number, number>)(val as number) ??
    (scale as d3.ScalePoint<string>)(val as string) ?? 0;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  data: ConflictEvent | null;
}

const ParallelCoordinatesPlot: React.FC<ParallelCoordinatesPlotProps> = ({ data }) => {
  const chartRef = useRef<SVGSVGElement>(null);
  const [showParallelSets, setShowParallelSets] = useState<boolean>(false);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, data: null });
  const [showInterInfo, setShowInterInfo] = useState(false);

  useEffect(() => {
    if (!data || data.length === 0 || !chartRef.current) return;

    const chart = chartRef.current;
    d3.select(chart).selectAll('*').remove();

    const margin = { top: 150, right: 50, bottom: 10, left: 100 };
    const containerWidth = chart.parentElement?.clientWidth || window.innerWidth * 0.9;
    const width = containerWidth - margin.left - margin.right;
    const height = containerWidth * 0.4 - margin.top - margin.bottom;

    const yScales: Partial<Record<PcpDim, YScale>> = {};
    const xScale = d3.scalePoint<string>().domain(DIMENSIONS).range([0, width]).padding(0.9);

    const svg = d3
      .select(chart)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    DIMENSIONS.forEach((dimension) => {
      const values = data.map((d) => {
        const val = getDimValue(d, dimension);
        return val === null || val === undefined ? 0 : val;
      });

      if (dimension === 'subEventType') {
        const sortedValues = [...new Set(values as string[])].sort(sortSubEvents);
        yScales[dimension] = d3.scalePoint<string>().domain(sortedValues).range([height, 0]);
      } else {
        if (typeof values[0] === 'string') {
          yScales[dimension] = d3.scalePoint<string>().domain([...(new Set(values as string[]))]).range([height, 0]);
        } else {
          const extent = d3.extent(values as number[]) as [number, number];
          yScales[dimension] = d3
            .scaleLinear()
            .domain([Math.min(0, extent[0]), extent[1]])
            .range([height, 0]);
        }
      }
    });

    const eventTypes = [...new Set(data.map((d) => d.eventType))];
    const colorScale = d3.scaleOrdinal<string>().domain(eventTypes).range(d3.schemeCategory10);

    const maxFatalities = d3.max(data, (d) => d.fatalities) ?? 0;

    const lineGen = d3
      .line<[number, number]>()
      .x((point) => point[0])
      .y((point) => point[1])
      .curve(d3.curveNatural);

    const legend = svg
      .append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - 120}, ${30})`);

    svg
      .selectAll<SVGPathElement, ConflictEvent>('.line')
      .data(data)
      .enter()
      .append('path')
      .attr('class', 'line')
      .attr('d', (d) => {
        const points: [number, number][] = DIMENSIONS.flatMap((dim, i) => {
          const x = xScale(dim) ?? 0;
          const val = getDimValue(d, dim);
          const scale = yScales[dim];
          const y = scale ? applyYScale(scale, val) : 0;

          if (i === 0) {
            const nextDim = DIMENSIONS[1];
            const nextVal = getDimValue(d, nextDim);
            const nextScale = yScales[nextDim];
            const nextX = xScale(nextDim) ?? 0;
            const nextY = nextScale ? applyYScale(nextScale, nextVal) : 0;
            const midY = nextY < height / 3 ? height / 6 : nextY < (2 * height) / 3 ? height / 2 : (5 * height) / 6;
            return [[x, y], [(x + nextX) / 2, midY]];
          }
          if (i === 1) {
            const nextDim = DIMENSIONS[2];
            const nextVal = getDimValue(d, nextDim);
            const nextScale = yScales[nextDim];
            const nextX = xScale(nextDim) ?? 0;
            const nextY = nextScale ? applyYScale(nextScale, nextVal) : 0;
            const midY = nextY < height / 3 ? height / 7 : nextY < (2 * height) / 3 ? height / 2 : (5 * height) / 6;
            return [[x, y], [(x + nextX) / 2, midY]];
          }
          if (i === 2) {
            const nextDim = DIMENSIONS[3];
            const nextX = xScale(nextDim) ?? 0;
            const fat = d.fatalities ?? 0;
            const midY = fat > maxFatalities * 0.66 ? height / 6 : fat > maxFatalities * 0.33 ? height / 2 : (5 * height) / 6;
            return [[x, y], [(x + nextX) / 2, midY]];
          }
          return [[x, y]];
        });
        return lineGen(points);
      })
      .style('fill', 'none')
      .style('stroke', (d) => colorScale(d.eventType))
      .style('stroke-width', '1.5px')
      .style('cursor', 'pointer')
      .style('opacity', 0.3)
      .on('mouseover', function (event, d) {
        const [mx, my] = d3.pointer(event, chart.parentElement!);
        setTooltip({ visible: true, x: mx, y: my, data: d });
        d3.select(this).style('stroke-width', '4px').style('opacity', 1);
      })
      .on('mouseout', function (_event, d) {
        setTooltip((prev) => ({ ...prev, visible: false }));
        const isSelectedType =
          legend.select('.legend-item.active').size() > 0 &&
          d.eventType === (legend.select<SVGGElement>('.legend-item.active').datum() as string);

        d3.select(this)
          .style('stroke-width', isSelectedType ? '5.0px' : '1.5px')
          .style('opacity', isSelectedType ? 1 : 0.1);
      });

    const axes = svg
      .selectAll<SVGGElement, PcpDim>('.axis')
      .data(DIMENSIONS)
      .enter()
      .append('g')
      .attr('class', 'axis')
      .attr('transform', (d) => `translate(${xScale(d) ?? 0})`)
      .each(function (d) {
        const scale = yScales[d];
        if (scale) d3.select(this).call(d3.axisLeft(scale as d3.AxisScale<d3.AxisDomain>));
      });

    legend
      .selectAll<SVGGElement, string>('.legend-item')
      .data(eventTypes)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (_d, i) => `translate(0, ${i * 30})`)
      .style('cursor', 'pointer')
      .on('click', function (_event, d) {
        const isActive = !d3.select(this).classed('active');
        legend.selectAll('.legend-item').classed('active', false);
        d3.select(this).classed('active', isActive);
        svg
          .selectAll<SVGPathElement, ConflictEvent>('.line')
          .style('opacity', (lineData) => (isActive ? (lineData.eventType === d ? 1 : 0.1) : 0.3))
          .style('stroke-width', (lineData) =>
            isActive ? (lineData.eventType === d ? '5.0px' : '1px') : '1px'
          );
      })
      .call((g) => {
        g.append('rect').attr('width', 15).attr('height', 15).style('fill', (d) => colorScale(d));
        g.append('text')
          .attr('x', 20)
          .attr('y', 12)
          .style('font-size', '12px')
          .style('font-family', 'Arial, sans-serif')
          .text((d) => d);
      });

    axes
      .append('text')
      .style('text-anchor', 'middle')
      .attr('y', -40)
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .style('fill', 'black')
      .style('font-family', 'Arial, sans-serif')
      .text((d) => AXIS_LABELS[d]);

    return () => {
      d3.select(chart).selectAll('*').remove();
    };
  }, [data]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '800px',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* Hover tooltip */}
      {tooltip.visible && tooltip.data && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x + 14,
            top: tooltip.y - 10,
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '6px',
            padding: '10px 14px',
            pointerEvents: 'none',
            zIndex: 2000,
            boxShadow: '0 3px 10px rgba(0,0,0,0.15)',
            fontSize: '12px',
            lineHeight: '1.7',
            maxWidth: '260px',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>
            {tooltip.data.eventType}
          </div>
          <div style={{ color: '#555', marginBottom: '6px' }}>{tooltip.data.subEventType}</div>
          <div><span style={{ color: '#888' }}>Date:</span> {tooltip.data.eventDate}</div>
          <div><span style={{ color: '#888' }}>Actor 1:</span> {tooltip.data.actor1.name}</div>
          {tooltip.data.actor1.associatedActor && (
            <div style={{ paddingLeft: '8px', color: '#666', fontSize: '11px' }}>
              assoc: {tooltip.data.actor1.associatedActor}
            </div>
          )}
          {tooltip.data.actor2 && (
            <div><span style={{ color: '#888' }}>Actor 2:</span> {tooltip.data.actor2.name}</div>
          )}
          {tooltip.data.actor2?.associatedActor && (
            <div style={{ paddingLeft: '8px', color: '#666', fontSize: '11px' }}>
              assoc: {tooltip.data.actor2.associatedActor}
            </div>
          )}
          <div><span style={{ color: '#888' }}>Location:</span> {tooltip.data.location.name}, {tooltip.data.location.country}</div>
          <div><span style={{ color: '#888' }}>Fatalities:</span> {tooltip.data.fatalities}</div>
        </div>
      )}

      {/* Actor inter-code info panel */}
      {showInterInfo && (
        <div
          style={{
            position: 'fixed',
            bottom: '70px',
            right: '20px',
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '6px',
            padding: '12px 16px',
            zIndex: 1600,
            boxShadow: '0 3px 10px rgba(0,0,0,0.15)',
            fontSize: '12px',
            lineHeight: '1.8',
            pointerEvents: 'auto',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>Actor Type Codes</div>
          {Object.entries(INTER_CODES).map(([code, label]) => (
            <div key={code}>
              <span style={{ fontWeight: 600, marginRight: '6px' }}>{code}</span>
              <span style={{ color: '#555' }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1500,
          background: 'white',
          padding: '10px',
          borderRadius: '5px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <label style={{ cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showParallelSets}
            onChange={(e) => setShowParallelSets(e.target.checked)}
          />
          {' Show Parallel Sets'}
        </label>
        <button
          onClick={() => setShowInterInfo((v) => !v)}
          style={{
            background: 'none',
            border: '1px solid #aaa',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            padding: '2px 8px',
            color: '#444',
          }}
        >
          {showInterInfo ? 'Hide' : 'ℹ'} Actor Codes
        </button>
      </div>

      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          opacity: showParallelSets ? 0 : 1,
          transform: `translateX(${showParallelSets ? '-100%' : '0'})`,
          transition: 'all 0.5s ease-in-out',
          pointerEvents: 'auto',
        }}
      >
        <svg ref={chartRef} style={{ width: '100%', height: '100%' }} />
      </div>

      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          opacity: showParallelSets ? 1 : 0,
          transform: `translateX(${showParallelSets ? '0' : '100%'})`,
          transition: 'all 0.5s ease-in-out',
          pointerEvents: 'auto',
        }}
      >
        <ParallelSets data={data} />
      </div>
    </div>
  );
};

export default ParallelCoordinatesPlot;
