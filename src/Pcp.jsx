import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

const ParallelCoordinatesPlot = ({ data }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    console.log("Sample data record:", data[0]);
    console.log("All available fields:", Object.keys(data[0])); 

    const dimensions = ["actor1", "fatalities", "interaction", "actor2"];

    const margin = { top: 80, right: 50, bottom: 10, left: 50 };
    const width = 1400 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

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
      .padding(0.5);

    dimensions.forEach((dimension) => {
      const values = data.map((d) => d[dimension]);
      if (typeof values[0] === "string") {
        yScales[dimension] = d3
          .scalePoint()
          .domain([...new Set(values)])
          .range([height, 0]);
      } else {
        yScales[dimension] = d3
          .scaleLinear()
          .domain(d3.extent(values))
          .range([height, 0]);
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

    const line = d3.line();    
    svg
      .selectAll(".line")
      .data(data)
      .enter()
      .append("path")
      .attr("class", "line")
      .attr("d", (d) =>
        line(dimensions.map((dim) => [xScale(dim), yScales[dim](d[dim])])))
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
              <p><strong>Interaction:</strong> ${d.interaction}</p>
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
      // .on("mouseout", function () {
      //   d3.select(this)
      //     // .style("stroke", "steelblue")
      //     .style("stroke-width", "1.5px")
      //     .style("opacity", 0.3);
      //   tooltip.style("display", "none");
      // });    

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
    
    // legend
    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - 120}, ${150})`)


    const legendItems = legend.selectAll(".legend-item")
      .data(eventTypes)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 50})`)
      .style("cursor", "pointer")
      .on("click", function(event, d) {
        // Toggle highlight for selected event type
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
        actor1: "ACTOR 1",
        actor2: "ACTOR 2",
        fatalities: "FATATALITIES",
        interaction: "INTERACTION"
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
      d3.select(chartRef.current).selectAll("*").remove();
      tooltip.remove();
    };

  }, [data]);

  return <svg ref={chartRef} style={{ width: "100%", height: "100%"}}   onWheel={(e) => {
    e.preventDefault();
    e.stopPropagation();
  }}/>;
};

export default ParallelCoordinatesPlot;


 