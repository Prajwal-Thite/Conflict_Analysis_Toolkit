import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';

const WordCloud = () => {
  const [data, setData] = useState([]);
  const svgRef = useRef();

  const fetchData = async () => {
    try {
      const response = await fetch(`${process.env.PUBLIC_URL}/complete_dataset.json`);
      if (!response.ok) {
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
        const first100Events = jsonData.slice(0, 5000);
        setData(first100Events.map(event => event.notes));
      }
    });          
  }, []);

  useEffect(() => {
    if (!data.length) return;

    d3.select(svgRef.current).selectAll("*").remove();

    const words = data
      .filter(note => note)
      .flatMap(note => 
        String(note)
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .replace(/\d+/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .split(' ')
      )
      .filter(word => 
        word.length > 3 && 
        !['the', 'and', 'for', 'with', 'that', 'this', 'from', 'were', 'what'].includes(word)
      );

    const wordCount = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    const width = 1000;  
    const height = 600;  

    const calculateDynamicScale = (wordCount, containerWidth, containerHeight) => {
      const totalWords = Object.keys(wordCount).length;
      const containerArea = containerWidth * containerHeight;
      const scaleFactor = Math.sqrt(containerArea / totalWords) * 0.5;
      return scaleFactor;
    };

    const scaleFactor = calculateDynamicScale(wordCount, width - 100, height - 100);
    const wordData = Object.entries(wordCount)
      .map(([text, size]) => ({ 
        text, 
        size: Math.min(Math.pow(size, 0.255) * scaleFactor, height / 6) 
      }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 50);

    const layout = cloud()
      .size([width, height])
      .words(wordData)
      .padding(5)
      .rotate(() => 0)
      .fontSize(d => Math.min(d.size, 60))
      .spiral('archimedean')
      .text(d => d.text)
      .random(() => 0.5)
      .on("end", draw);

    function draw(words) {
      const svg = d3.select(svgRef.current)
        .append("svg")
        .attr("width", width)
        .attr("height", height)        
        .append("g")
        .attr("transform", `translate(${width/2},${height/2})`);

      svg.selectAll("text")
        .data(words)
        .enter()
        .append("text")
        .style("font-size", d => `${d.size}px`)
        .style("font-family", "Impact")
        .style("fill", (d, i) => d3.schemeCategory10[i % 10])
        .attr("text-anchor", "middle")
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .text(d => d.text);
    }

    layout.start();
  }, [data]);

  return (
    <div 
      ref={svgRef} 
      style={{ 
        width: '100%',           
        maxWidth: '1000px',      
        height: '600px',         
        margin: '50px auto',
        backgroundColor: '#ffffff',
        border: '2px solid #ccc',
        padding: '20px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative'
      }}
    />
  );
};

export default WordCloud;
