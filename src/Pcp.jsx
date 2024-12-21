import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

const ParallelCoordinatesPlot = ({ data }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const chart = chartRef.current;

    console.log("Sample data record:", data[0]);
    console.log("All available fields:", Object.keys(data[0])); 

    const dimensions = ["subEventType", "inter1", "inter2", "fatalities"];

    const margin = { top: 80, right: 150, bottom: 10, left:5 };
    const width = window.innerWidth * 0.9 - margin.left - margin.right; //1200 for desktop
    const height = window.innerWidth * 0.35 - margin.top - margin.bottom; //500 for desktop

    d3.select(chartRef.current).selectAll("*").remove();

    const svg = d3
      .select(chartRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);


    // wheel zoom for pcp

    const zoom = d3.zoom()
      .scaleExtent([1, 5])
      .on("zoom", (event) => {
        svg.attr("transform", event.transform);
      });
    
    d3.select(chartRef.current).call(zoom);


    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background-color", "white")
      .style("border", "1px solid #ccc")
      .style("padding", "10px")
      .style("border-radius", "5px")
      .style("font-size", "12px")
      .style("display", "none")
      .style("z-index", "9999"); // to ensure tooltip stays on top

    const yScales = {};
    const xScale = d3
      .scalePoint()
      .domain(dimensions)
      .range([0, width])
      .padding(0.9);

    dimensions.forEach((dimension) => {
      const values = data.map((d) => {
        const val = d[dimension];
        return (val === null || val === undefined) ? 0 : val;
      });

      if (dimension === "subEventType") {
        // grouped similar event types together
        const uniqueSubEvents = [...new Set(values)];
        console.log("Unique subEventTypes:", uniqueSubEvents);
        const sortedValues = [...new Set(values)].sort((a, b) => {    
 
          // bottom

          if (a.includes('regains territory') && !b.includes('regains territory')) return -1;
          if (!a.includes('regains territory') && b.includes('regains territory')) return 1;

          if (a.includes('Agreement') && !b.includes('Agreement')) return -1;
          if (!a.includes('Agreement') && b.includes('Agreement')) return 1;

          if (a.includes('Arrests') && !b.includes('Arrests')) return -1;
          if (!a.includes('Arrests') && b.includes('Arrests')) return 1;

          if (a.includes('Disrupted weapons') && !b.includes('Disrupted weapons')) return -1;
          if (!a.includes('Disrupted weapons') && b.includes('Disrupted weapons')) return 1;

          if (a.includes('Change to group') && !b.includes('Change to group')) return -1;
          if (!a.includes('Change to group') && b.includes('Change to group')) return 1;
          
          if (a.includes('Armed clash') && !b.includes('Armed clash')) return -1;
          if (!a.includes('Armed clash') && b.includes('Armed clash')) return 1;
          
          // middle

          if (a.includes('Looting') && !b.includes('Looting')) return -1;
          if (!a.includes('Looting') && b.includes('Looting')) return 1;

          if (a.includes('Other') && !b.includes('Other')) return -1;
          if (!a.includes('Other') && b.includes('Other')) return 1;

          if (a.includes('Attack') && !b.includes('Attack')) return -1;
          if (!a.includes('Attack') && b.includes('Attack')) return 1;

          if (a.includes('Remote explosive') && !b.includes('Remote explosive')) return -1;
          if (!a.includes('Remote explosive') && b.includes('Remote explosive')) return 1;

          if (a.includes('Grenade') && !b.includes('Grenade')) return -1;
          if (!a.includes('Grenade') && b.includes('Grenade')) return 1;

          if (a.includes('Mob violence') && !b.includes('Mob violence')) return -1;
          if (!a.includes('Mob violence') && b.includes('Mob violence')) return 1;

          //top

          if (a.includes('Air/drone strike') && !b.includes('Air/drone strike')) return -1;
          if (!a.includes('Air/drone strike') && b.includes('Air/drone strike')) return 1;

          if (a.includes('Shelling/artillery/missile attack') && !b.includes('Shelling/artillery/missile attack')) return -1;
          if (!a.includes('Shelling/artillery/missile attack') && b.includes('Shelling/artillery/missile attack')) return 1;

          if (a.includes('Abduction') && !b.includes('Abduction')) return -1;
          if (!a.includes('Abduction') && b.includes('Abduction')) return 1;

          if (a.includes('Non') && !b.includes('Non')) return -1;
          if (!a.includes('Non') && b.includes('Non')) return 1;

          if (a.includes('transfer of territory') && !b.includes('transfer of territory')) return -1;
          if (!a.includes('transfer of territory') && b.includes('transfer of territory')) return 1;

          if (a.includes('Peaceful protest') && !b.includes('Peaceful protest')) return -1;
          if (!a.includes('Peaceful protest') && b.includes('Peaceful protest')) return 1;    

          
          return a.localeCompare(b);
        });

        yScales[dimension] = d3
          .scalePoint()
          .domain(sortedValues)
          .range([height, 0]);
      } else {
        // scale logic for other dimensions
        if (typeof values[0] === "string") {
          yScales[dimension] = d3
            .scalePoint()
            .domain([...new Set(values)])
            .range([height, 0]);
        } else {
          const extent = d3.extent(values);
          yScales[dimension] = d3
            .scaleLinear()
            .domain([Math.min(0, extent[0]), extent[1]])
            .range([height, 0]);
        }
      }
    });

    const eventTypes = [...new Set(data.map(d => d.event_type))];
    const colorScale = d3.scaleOrdinal()
      .domain(eventTypes)
      .range(d3.schemeCategory10);    
   
    // const colorScale = d3.scaleOrdinal()
    //   .domain(eventTypes)
    //   .range([
    //     '#1f77b4',  // blue
    //     '#d62728',  // red
    //     '#2ca02c',  // green
    //     '#8c564b',  // Brown
    //     '#9467bd',  // Purple
    //     '#17becf',  // cyan
    //     '#FFD700',  // golden
    //   ]);

    //for dynamically setting up our bundling in pcp
    const maxFatalities = d3.max(data, d => d.fatalities || 0);
    
    const line = d3.line()
    .x(d => d[0])
    .y(d => d[1])
    .curve(d3.curveNatural);  
    svg
    .selectAll(".line")
    .data(data)
    .enter()
    .append("path")
    .attr("class", "line")
    .attr("d", (d) => {
      const points = dimensions.flatMap((dim, i) => {
        const x = xScale(dim);
        const val = d[dim] === null || d[dim] === undefined ? 0 : d[dim];
        const y = yScales[dim](val);
  
        if (i === 0) {
          // First to second axis bundling
          const nextDim = dimensions[1];
          const nextX = xScale(nextDim);
          const nextVal = d[nextDim] === null || d[nextDim] === undefined ? 0 : d[nextDim];
          const nextY = yScales[nextDim](nextVal);
          
          let midY;
          if (nextY < height / 3) {
            midY = height / 6;
          } else if (nextY < 2 * height / 3) {
            midY = height / 2;
          } else {
            midY = 5 * height / 6;
          }
          
          const midX = (x + nextX) / 2;
          return [[x, y], [midX, midY]];
        } else if (i === 1) {
          // Second to third axis bundling
          const nextDim = dimensions[2];
          const nextX = xScale(nextDim);
          const nextVal = d[nextDim] === null || d[nextDim] === undefined ? 0 : d[nextDim];
          const nextY = yScales[nextDim](nextVal);
          
          let midY;
          if (nextY < height / 3) {
            midY = height / 7;
          } else if (nextY < 2 * height / 3) {
            midY = height / 2;
          } else {
            midY = 5 * height / 6;
          }
          
          const midX = (x + nextX) / 2;
          return [[x, y], [midX, midY]];
        } else if (i === 2) {
          // Third to fourth axis bundling based on fatalities
          const nextDim = dimensions[3];
          const nextX = xScale(nextDim);
          const fatalities = d.fatalities || 0;
          
          let midY;
          if (fatalities > maxFatalities * 0.66) {  // High fatalities
            midY = height / 6;
          } else if (fatalities > maxFatalities * 0.33) {  // Medium fatalities
            midY = height / 2;
          } else {  // Low fatalities
            midY = 5 * height / 6;
          }
          
          const midX = (x + nextX) / 2;
          return [[x, y], [midX, midY]];
        }
  
        return [[x, y]];
      });
  
      return line(points);
    })

      .style("fill", "none")
      .style("stroke", d => colorScale(d.event_type))
      .style("stroke-width", "1.5px")
      .style("cursor", "pointer")
      .style("opacity", 0.3)
      .on("mouseover", function (event, d) {
        d3.select(this)
          // .style("stroke", "orange")
          .style("stroke-width", "2.5px")
          .style("opacity", 1);
        
        tooltip
          .style("display", "block")
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 10}px`)
          .style("background", "rgba(255, 255, 255, 0.95)")
          .style("padding", "15px")
          .style("border-radius", "8px")
          .style("box-shadow", "0 2px 10px rgba(0,0,0,0.2)")
          .style("font-family", "Arial, sans-serif")
          .style("max-width", "300px")          
          .html(`
            <div style="font-size: 14px; line-height: 1.5;">
              <h3 style="margin: 0 0 10px 0; color: #333;">Event Details</h3>
              <p><strong>Actor 1:</strong> ${d.actor1}</p>
              <p><strong>Actor 2:</strong> ${d.actor2}</p>              
              <p><strong>Sub Event Type:</strong> ${d.subEventType}</p>
              <p><strong>Fatalities:</strong> ${d.fatalities}</p>
              <p><strong>Notes:</strong> ${d.notes}</p>
            </div>
          `);
      })
      .on("mouseout", function (event, d) {
        const legendActive = legend.select(".legend-item.active").size() > 0;
        const isSelectedType = legendActive && 
          d.event_type === legend.select(".legend-item.active").datum();
          
        d3.select(this)
          .style("stroke-width", isSelectedType ? "5.0px" : "1.5px")
          .style("opacity", isSelectedType ? 1 : 0.1);
        
        tooltip.style("display", "none");
      })  

    const axes = svg
      .selectAll(".axis")
      .data(dimensions)
      .enter()
      .append("g")
      .attr("class", "axis")
      .attr("transform", (d) => `translate(${xScale(d)})`)
      .each(function (d) {
        d3.select(this).call(d3.axisLeft(yScales[d]));
      });
    
    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - 120}, ${30})`)


    const legendItems = legend.selectAll(".legend-item")
      .data(eventTypes)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 50})`)
      .style("cursor", "pointer")
      .on("click", function(event, d) {
        // toggle highlight for selected event type
        const isActive = !d3.select(this).classed("active");
        legend.selectAll(".legend-item").classed("active", false);
        d3.select(this).classed("active", isActive);
        svg.selectAll(".line")
        .style("opacity", line => 
          isActive ? (line.event_type === d ? 1 : 0.1) : 0.3
        )
        .style("stroke-width", line => 
          isActive ? (line.event_type === d ? 5.0 : 1) : 1
        );
    });

    legendItems.append("rect")
      .attr("width", 15)
      .attr("height", 15)
      .style("fill", d => colorScale(d));

    legendItems.append("text")
      .attr("x", 20)
      .attr("y", 12)
      .style("font-size", "12px")
      .style("font-family", "Arial, sans-serif")
      .text(d => d);

    
    const axisLabels = {
        inter1: "ACTOR 1",
        inter2: "ACTOR 2",
        fatalities: "FATATALITIES",
        subEventType: "SUB EVENT",
      };

    axes
      .append("text")
      .style("text-anchor", "middle")
      .attr("y", -40)
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .style("fill", "black")
      .style("font-family", "Arial, sans-serif")      
      .text(d => axisLabels[d]);      

    return () => {
      d3.select(chart).selectAll("*").remove();
      tooltip.remove();
    };

  }, [data]);

  return <svg ref={chartRef} style={{ width: "100%", height: "100%"}}   onWheel={(e) => {
    e.preventDefault();
    e.stopPropagation();
  }}/>;
};

export default ParallelCoordinatesPlot;


 