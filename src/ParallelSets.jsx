import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";

const ParallelSets = ({ data }) => {
  const chartRef = useRef(null);

  const getFatalityCategory = (fatalities) => {
    if (fatalities <= 5) return 'Low';
    if (fatalities <= 20) return 'Medium';
    return 'High';
  };

  const formatLabel = (name) => {
    const [dimension, value] = name.split('-');
    
    if (dimension === 'event_type') {
        return value; // Event types are already concise
      }
      return value;
  };

  useEffect(() => {
    if (!data || data.length === 0) return;

    const dimensions = ["event_type", "inter1", "inter2", "fatalityLevel"];
    const margin = { top: 150, right: 200, bottom: 10, left: 50 };
    const width = window.innerWidth * 0.9 - margin.left - margin.right;
    const height = window.innerWidth * 0.4 - margin.top - margin.bottom;

    d3.select(chartRef.current).selectAll("*").remove();

    const svg = d3
      .select(chartRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const colorScale = d3.scaleOrdinal()
      .domain([...new Set(data.map(d => d.event_type))])
      .range(d3.schemeCategory10);

    const sankeyData = {
      nodes: [],
      links: []
    };

    dimensions.forEach((dim, i) => {
      const values = [...new Set(data.map(d => 
        dim === 'fatalityLevel' 
          ? getFatalityCategory(d.fatalities)
          : d[dim]
      ))];
      values.forEach(value => {
        sankeyData.nodes.push({
          name: `${dim}-${value}`,
          dimension: i
        });
      });
    });

    dimensions.slice(0, -1).forEach((dim, i) => {
      const nextDim = dimensions[i + 1];
      const flows = {};
      
      data.forEach(d => {
        const sourceNode = `${dim}-${d[dim]}`;
        const targetNode = `${nextDim}-${
          nextDim === 'fatalityLevel' 
            ? getFatalityCategory(d.fatalities)
            : d[nextDim]
        }`;
        const key = `${sourceNode}->${targetNode}`;
        flows[key] = {
          count: (flows[key]?.count || 0) + 1,
          eventType: d.event_type
        };
      });

      Object.entries(flows).forEach(([key, value]) => {
        const [source, target] = key.split('->');
        sankeyData.links.push({
          source: sankeyData.nodes.findIndex(n => n.name === source),
          target: sankeyData.nodes.findIndex(n => n.name === target),
          value: value.count,
          eventType: value.eventType
        });
      });
    });

    const sankeyLayout = sankey()
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[0, 0], [width, height]]);

    const { nodes, links } = sankeyLayout(sankeyData);

    svg.append("g")
      .selectAll("path")
      .data(links)
      .join("path")
      .attr("d", sankeyLinkHorizontal())
      .attr("fill", "none")
      .attr("stroke", d => colorScale(d.eventType))
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", d => Math.max(1, d.width));

    
    svg.append("g")
    .selectAll("rect")
    .data(nodes)
    .join("rect")
    .attr("x", d => d.x0)
    .attr("y", d => d.y0)
    .attr("height", d => d.y1 - d.y0)
    .attr("width", d => d.x1 - d.x0)
    .attr("fill", d => d.dimension === 0 ? colorScale(d.name.split('-')[1]) : "#4A5568");


    svg.append("g")
    .selectAll("text")
    .data(nodes)
    .join("text")
    .attr("x", d => d.dimension === 0 ? d.x1 + 6 : d.x0 - 6)  // Position labels on right side for first dimension
    .attr("y", d => (d.y1 + d.y0) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", d => d.dimension === 0 ? "start" : "end")  // Align text left for first dimension
    .text(d => formatLabel(d.name)); 

    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - (-40)}, 30)`);

    const uniqueCategories = [...new Set(data.map(d => d.event_type))];

    const legendItems = legend.selectAll(".legend-item")
      .data(uniqueCategories)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 20})`);

    legendItems.append("rect")
      .attr("width", 15)
      .attr("height", 15)
      .style("fill", d => colorScale(d));

    legendItems.append("text")
      .attr("x", 20)
      .attr("y", 12)
      .style("font-size", "12px")
      .text(d => d);

  }, [data]);

  return <svg ref={chartRef} style={{ width: "100%", height: "100%" }} />;
};

export default ParallelSets;
