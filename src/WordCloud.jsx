import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';

const WordCloud = ({ data }) => {
  const svgRef = useRef();

  useEffect(() => {

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

    // Count word frequency
    const wordCount = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    const width = 1000;  
    const height = 600;  

    const calculateDynamicScale = (wordCount, containerWidth, containerHeight) => {
    const totalWords = Object.keys(wordCount).length;
    const containerArea = containerWidth * containerHeight;
    const scaleFactor = Math.sqrt(containerArea / totalWords) * 0.3;
    return scaleFactor;
    };

    const scaleFactor = calculateDynamicScale(wordCount, width - 100, height - 100);
    const wordData = Object.entries(wordCount)
    .map(([text, size]) => ({ 
        text, 
        size: Math.min(Math.pow(size, 0.305) * scaleFactor, height / 6) 
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
      .on("end", draw);


    function draw(words) {
      const svg = d3.select(svgRef.current)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("border", "1px solid black")
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
      width: '100%',           // Make container width responsive
      maxWidth: '1000px',      // Set maximum width
      height: '600px',         // Match the height
      margin: '0 auto',
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
