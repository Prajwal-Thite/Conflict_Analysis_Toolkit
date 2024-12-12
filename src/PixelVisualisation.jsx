import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const PixelVisualization = ({ data }) => {
  const pixelRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Clear previous visualization
    d3.select(pixelRef.current).selectAll("*").remove();

    // Process data
    const dateMap = new Map();
    const startDate = d3.min(data, d => new Date(d.event_date));
    const endDate = d3.max(data, d => new Date(d.event_date));
    const totalDays = d3.timeDay.count(startDate, d3.timeDay.offset(endDate, 1));

    // Setup dimensions
    // Calculate pixel size
    const pixelSize = 35; // Fixed pixel size
    const gridWidth = 5; // Fixed width
    const gridHeight = Math.ceil(totalDays / gridWidth);  // Calculate required height
    const margin = { top: 60, right: 100, bottom: 40, left: 100 };
    const width = gridWidth * pixelSize;
    const height = gridHeight * pixelSize;    


    // Create SVG
    const svg = d3.select(pixelRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);


    // Fill in all dates between start and end with 0 fatalities
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
    dateMap.set(currentDate.toISOString().split('T')[0], 0);
    currentDate = d3.timeDay.offset(currentDate, 1);
    }

    // Sum fatalities for each date
    data.forEach(d => {
      const dateKey = new Date(d.event_date).toISOString().split('T')[0];
      dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + (d.fatalities || 0));
    });

    // Convert map to array
    const timelineData = Array.from(dateMap, ([date, fatalities]) => ({
      date: new Date(date),
      fatalities: fatalities
    }));

    // Sort by date
    timelineData.sort((a, b) => a.date - b.date);

    // Create scales
    const xScale = d3.scaleTime()
      .domain([startDate, endDate])
      .range([0, width]);

    const colorScale = d3.scaleSequential()
      .domain([0, d3.max(timelineData, d => d.fatalities)])
      .interpolator(d3.interpolateReds);


    // Create pixels
    svg.selectAll("rect")
      .data(timelineData)
      .enter()
      .append("rect")
      .attr("x", (d, i) => (i % gridWidth) * pixelSize)
      .attr("y", (d, i) => Math.floor(i / gridWidth) * pixelSize)
      .attr("width", pixelSize - 1)
      .attr("height", pixelSize - 1)
      .attr("fill", d => colorScale(d.fatalities))
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5)
      .on("mouseover", function(event, d) {
        // Tooltip
        const tooltip = d3.select("body")
          .append("div")
          .attr("class", "pixel-tooltip")
          .style("position", "absolute")
          .style("background", "rgba(255, 255, 255, 0.9)")
          .style("padding", "10px")
          .style("border-radius", "5px")
          .style("box-shadow", "0 0 10px rgba(0,0,0,0.1)")
          .style("pointer-events", "none")
          .style("z-index", 9999);

        tooltip.html(`
          <div>
            <strong>Date:</strong> ${new Date(d.date.getTime() + 86400000).toLocaleDateString()}<br>
            <strong>Fatalities:</strong> ${d.fatalities}
          </div>
        `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px");

        // Highlight pixel
        d3.select(this)
          .attr("stroke", "#000")
          .attr("stroke-width", 2);
      })
      .on("mouseout", function() {
        // Remove tooltip
        d3.selectAll(".pixel-tooltip").remove();
        
        // Reset pixel style
        d3.select(this)
          .attr("stroke", "#fff")
          .attr("stroke-width", 0.5);
      });

    // Add title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -40)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text("FATALITY-TIMELINE");

    // Create legend
    const legendWidth = 20;
    const legendHeight = height;

    // Create gradient for legend
    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient")
    .attr("id", "legend-gradient")
    .attr("x1", "0%")
    .attr("x2", "0%")
    .attr("y1", "100%")
    .attr("y2", "0%");

    // Add color stops
    const maxFatalities = d3.max(timelineData, d => d.fatalities);
    const colorStops = [0, 0.25, 0.5, 0.75, 1];
    colorStops.forEach(stop => {
    linearGradient.append("stop")
        .attr("offset", `${stop * 100}%`)
        .attr("stop-color", colorScale(stop * maxFatalities));
    });

    // Add legend rectangle
    const legend = svg.append("g")
    .attr("transform", `translate(${width + 40}, 0)`);

    legend.append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#legend-gradient)");

    // Add legend axis
    const legendScale = d3.scaleLinear()
    .domain([0, maxFatalities])
    .range([legendHeight, 0]);

    const legendAxis = d3.axisRight(legendScale)
    .ticks(5);

    legend.append("g")
    .attr("transform", `translate(${legendWidth}, 0)`)
    .call(legendAxis);

    // Add legend title
    legend.append("text")
    .attr("transform", "rotate(90)")
    .attr("x", legendHeight / 2)
    .attr("y", -legendWidth - 30)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Fatalities");

  }, [data]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      width: '100%', 
      height: '100%',
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate( -50%, -50%)',
      pointerEvents: 'none'
    }}>
      <svg ref={pixelRef} style={{ width: "auto", height: "auto", pointerEvents: 'auto' }} />
    </div>
  );
};

export default PixelVisualization;
