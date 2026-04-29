import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal, SankeyGraph } from 'd3-sankey';
import { ConflictEvent } from '../../domain/entities/ConflictEvent';
import { getFatalityLevel } from '../../domain/value-objects/EventType';

interface ParallelSetsProps {
  data: ConflictEvent[];
}

interface SankeyNodeData {
  name: string;
  dimension: number;
}

interface SankeyLinkData {
  eventType: string;
}

type ParallelSetsDim = 'eventType' | 'inter1' | 'inter2' | 'fatalityLevel';

const DIMENSIONS: ParallelSetsDim[] = ['eventType', 'inter1', 'inter2', 'fatalityLevel'];

function getDimValue(event: ConflictEvent, dim: ParallelSetsDim): string | number {
  switch (dim) {
    case 'eventType': return event.eventType;
    case 'inter1': return event.actor1.interCode;
    case 'inter2': return event.actor2?.interCode ?? 0;
    case 'fatalityLevel': return getFatalityLevel(event.fatalities);
  }
}

function formatLabel(name: string): string {
  const [, value] = name.split('-');
  return value ?? name;
}

const ParallelSets: React.FC<ParallelSetsProps> = ({ data }) => {
  const chartRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || data.length === 0 || !chartRef.current) return;

    const margin = { top: 150, right: 200, bottom: 10, left: 50 };
    const width = window.innerWidth * 0.9 - margin.left - margin.right;
    const height = window.innerWidth * 0.4 - margin.top - margin.bottom;

    d3.select(chartRef.current).selectAll('*').remove();

    const svg = d3
      .select(chartRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const colorScale = d3
      .scaleOrdinal<string>()
      .domain([...new Set(data.map((d) => d.eventType))])
      .range(d3.schemeCategory10);

    const sankeyData: { nodes: SankeyNodeData[]; links: Array<{ source: number; target: number; value: number; eventType: string }> } = {
      nodes: [],
      links: [],
    };

    DIMENSIONS.forEach((dim, i) => {
      const values = [...new Set(data.map((d) => String(getDimValue(d, dim))))];
      values.forEach((value) => {
        sankeyData.nodes.push({ name: `${dim}-${value}`, dimension: i });
      });
    });

    DIMENSIONS.slice(0, -1).forEach((dim, i) => {
      const nextDim = DIMENSIONS[i + 1];
      const flows: Record<string, { count: number; eventType: string }> = {};

      data.forEach((d) => {
        const sourceNode = `${dim}-${getDimValue(d, dim)}`;
        const targetNode = `${nextDim}-${getDimValue(d, nextDim)}`;
        const key = `${sourceNode}->${targetNode}`;
        flows[key] = {
          count: (flows[key]?.count ?? 0) + 1,
          eventType: d.eventType,
        };
      });

      Object.entries(flows).forEach(([key, value]) => {
        const [source, target] = key.split('->');
        sankeyData.links.push({
          source: sankeyData.nodes.findIndex((n) => n.name === source),
          target: sankeyData.nodes.findIndex((n) => n.name === target),
          value: value.count,
          eventType: value.eventType,
        });
      });
    });

    const sankeyLayout = sankey<SankeyNodeData, SankeyLinkData>()
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[0, 0], [width, height]]);

    const graph: SankeyGraph<SankeyNodeData, SankeyLinkData> = sankeyLayout(sankeyData as SankeyGraph<SankeyNodeData, SankeyLinkData>);

    svg
      .append('g')
      .selectAll('path')
      .data(graph.links)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('fill', 'none')
      .attr('stroke', (d) => colorScale((d as unknown as { eventType: string }).eventType))
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', (d) => Math.max(1, d.width ?? 0));

    svg
      .append('g')
      .selectAll('rect')
      .data(graph.nodes)
      .join('rect')
      .attr('x', (d) => d.x0 ?? 0)
      .attr('y', (d) => d.y0 ?? 0)
      .attr('height', (d) => (d.y1 ?? 0) - (d.y0 ?? 0))
      .attr('width', (d) => (d.x1 ?? 0) - (d.x0 ?? 0))
      .attr('fill', (d) =>
        d.dimension === 0 ? colorScale(d.name.split('-')[1] ?? '') : '#4A5568'
      );

    svg
      .append('g')
      .selectAll('text')
      .data(graph.nodes)
      .join('text')
      .attr('x', (d) => (d.dimension === 0 ? (d.x1 ?? 0) + 6 : (d.x0 ?? 0) - 6))
      .attr('y', (d) => ((d.y1 ?? 0) + (d.y0 ?? 0)) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d) => (d.dimension === 0 ? 'start' : 'end'))
      .text((d) => formatLabel(d.name));

    const uniqueCategories = [...new Set(data.map((d) => d.eventType))];
    const legendGroup = svg.append('g').attr('transform', `translate(${width + 40}, 30)`);

    const legendItems = legendGroup
      .selectAll('.legend-item')
      .data(uniqueCategories)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (_d, i) => `translate(0, ${i * 20})`);

    legendItems.append('rect').attr('width', 15).attr('height', 15).style('fill', (d) => colorScale(d));
    legendItems.append('text').attr('x', 20).attr('y', 12).style('font-size', '12px').text((d) => d);
  }, [data]);

  return <svg ref={chartRef} style={{ width: '100%', height: '100%' }} />;
};

export default ParallelSets;
