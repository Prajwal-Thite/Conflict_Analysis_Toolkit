import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import ParallelSets from "./ParallelSets";

const ParallelCoordinatesPlot = () => {
  const chartRef = useRef(null);
  //parallel set
  const [showParallelSets, setShowParallelSets] = useState(false);
  const [data, setData] = useState([]);
  
  const fetchData = async () => {
    try {
      // Try local path first
      const response = await fetch(`${process.env.PUBLIC_URL}/complete_dataset.json`);
      if (!response.ok) {
        // If local fails, try GitHub Pages URL
        const ghResponse = await fetch('https://prajwal-thite.github.io/Conflict_Analysis_Toolkit/complete_dataset.json');
        return await ghResponse.json();
      }
      return await response.json();
    } catch (error) {
      console.log('Error loading data:', error);
    }
  };

  useEffect(() => {
        
      fetchData().then((jsonData) => {
        if (jsonData && Array.isArray(jsonData)) {
          // Get n points from the dataset
          const first100Events = jsonData.slice(0, 5000);
          const points = first100Events.map(event => ({
            lat: event.latitude,
            lng: event.longitude,
            color: event.iso === 643 ? 'red' : event.iso === 804 ? 'black' : 'gray',
            event_type: event.event_type,
            subEventType: event.sub_event_type,
            fatalities: event.fatalities,
            notes: event.notes,            
            actor1: event.actor1,
            assoc_actor_1: event.assoc_actor_1,
            inter1: event.inter1,
            actor2: event.actor2,
            assoc_actor_2: event.assoc_actor_2,
            inter2: event.inter2,
            interaction: event.interaction,
            event_date: event.event_date,
            sub_event_type_code: event.sub_event_type_code,
            iso: event.iso,
          }));
          setData(points);
        }
        });          
  }, [])

  useEffect(() => {
    if (!data || data.length === 0) return;

    const chart = chartRef.current;
    d3.select(chartRef.current).selectAll("*").remove();

    const margin = { top: 150, right: 50, bottom: 10, left:100 };
    const width = window.innerWidth * 0.9 - margin.left - margin.right;
    const height = window.innerWidth * 0.4 - margin.top - margin.bottom;

    const dimensions = ["subEventType", "inter1", "inter2", "fatalities"];
    const yScales = {};
    const xScale = d3
      .scalePoint()
      .domain(dimensions)
      .range([0, width])
      .padding(0.9);

    const svg = d3
      .select(chartRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

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
      .on("mouseout", function (event, d) {
        const legendActive = legend.select(".legend-item.active").size() > 0;
        const isSelectedType = legendActive && 
          d.event_type === legend.select(".legend-item.active").datum();
          
        d3.select(this)
          .style("stroke-width", isSelectedType ? "5.0px" : "1.5px")
          .style("opacity", isSelectedType ? 1 : 0.1);       
        
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
      .attr("transform", (d, i) => `translate(0, ${i * 30})`)
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
      .attr("y", -50)
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .style("fill", "black")
      .style("font-family", "Arial, sans-serif")      
      .text(d => axisLabels[d]);      

    return () => {
      d3.select(chart).selectAll("*").remove();      
    };

  }, [data]);

  return (
    <div style={{ 
        position: 'relative', 
        width: '100%', 
        height: '800px',
        overflow: 'hidden',
        pointerEvents: 'none'
      }}>
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1500,
          background: 'white',
          padding: '10px',
          borderRadius: '5px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          pointerEvents: 'auto'
        }}>
          <label style={{ cursor: 'pointer' }}>
            <input 
              type="checkbox"
              checked={showParallelSets}
              onChange={(e) => setShowParallelSets(e.target.checked)}
            />
            {' Show Parallel Sets'}
          </label>
        </div>

        <div style={{ 
          position: 'absolute',
          width: '100%',
          height: '100%',
          opacity: showParallelSets ? 0 : 1,
          transform: `translateX(${showParallelSets ? '-100%' : '0'})`,
          transition: 'all 0.5s ease-in-out',
          pointerEvents: 'auto'
        }}>
          <svg ref={chartRef} style={{ width: "100%", height: "100%" }} />
        </div>

        <div style={{ 
          position: 'absolute',
          width: '100%',
          height: '100%',
          opacity: showParallelSets ? 1 : 0,
          transform: `translateX(${showParallelSets ? '0' : '100%'})`,
          transition: 'all 0.5s ease-in-out',
          pointerEvents: 'auto'
        }}>
          <ParallelSets data={data} />
        </div>
      </div>
    );
};

export default ParallelCoordinatesPlot;


 