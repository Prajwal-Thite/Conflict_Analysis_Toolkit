
import React, { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,   ReferenceLine,
  ReferenceArea,
  Brush,
  CartesianGrid } from "recharts";

const ThemeRiver = ({ data }) => {
  //states
  const [activeTypes, setActiveTypes] = useState(new Set());
  const [hoveredType, setHoveredType] = useState(null);

  // window size tracking
  const [dimensions, setDimensions] = useState(() => ({
    height: window.innerHeight,
    width: window.innerWidth
  }));

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        height: window.innerHeight,
        width: window.innerWidth
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculating dynamic height based on screen size
  const getChartHeight = () => {
    if (dimensions.height > 700) return 550; //desktop
    if (dimensions.height > 400) return 450; // laptop
    return 350; // smaller screens
  };
  
  console.log('Current screen height:', dimensions.height);
  console.log('Current chart height:', getChartHeight());

  // legend interaction handlers
  const handleLegendClick = (entry) => {
    setActiveTypes(prev => {
      const newActive = new Set(prev);
      if (newActive.has(entry.value)) {
        newActive.delete(entry.value);
      } else {
        newActive.add(entry.value);
      }
      return newActive;
    });
  };
  
  const processData = () => {
    // Sort data by date first
    const sortedData = [...data].sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    
    const eventsByDate = sortedData.reduce((acc, event) => {
      const date = event.event_date;
      if (!acc[date]) {
        acc[date] = {
          totalEvents: 0,
          rawCounts: {}
        };
      }
      if (!acc[date].rawCounts[event.subEventType]) {
        acc[date].rawCounts[event.subEventType] = 0;
      }
      acc[date].rawCounts[event.subEventType]++;
      acc[date].totalEvents++;
      return acc;
    }, {});

    // Convert raw counts to normalized values
    return Object.entries(eventsByDate).map(([date, data]) => {
      const result = { event_date: date, totalEvents: data.totalEvents };
      Object.entries(data.rawCounts).forEach(([type, count]) => {
        result[type] = count / data.totalEvents;
      });
      return result;
    });
  };

  const processedData = processData();
  const eventTypes = [...new Set(data.map(event => event.subEventType))];
  
  const getColor = (index) => `hsl(${index * (360 / eventTypes.length)}, 70%, 50%)`;

  return (
    <ResponsiveContainer width="100%" height={getChartHeight()}>
      <AreaChart
        data={processedData}
        margin={{ top: dimensions.height > 1080 ? 50 : 30,
          right: 50,                                     
          left: dimensions.height > 1080 ? 20 : 30,      
          bottom: dimensions.height > 1080 ? 120 : 100
        }}
        stackOffset="expand"
      >
        <XAxis 
          dataKey="event_date" 
          angle={-45} 
          textAnchor="end" 
          tickFormatter={(date) => new Date(date).toLocaleDateString()}
        />
        <Brush 
          dataKey="event_date"
          height={30}
          y={dimensions.height > 700 ? 470 : 370} 
          stroke="#8884d8"
        />
        <CartesianGrid 
          strokeDasharray="3 3" 
          vertical={false}
        />
        <YAxis 
          yAxisId="left"
          tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
          label={{ value: 'Event Distribution (%)', angle: -90, position: 'insideCenter', dx: -30 }}
        />
        <YAxis 
          yAxisId="right"
          orientation="right"
          dataKey="totalEvents"
          label={{ value: 'Total Events', angle: 90, position: 'insideRight' }}
        />
        <Tooltip 
          formatter={(value, name, props) => {
            if (name === 'totalEvents') return null;
            const actualCount = Math.round(value * props.payload.totalEvents);
            return [`${actualCount} events (${(value * 100).toFixed(1)}%)`, name];
          }}
          labelFormatter={(date, payload) => {
            const formattedDate = new Date(date).toLocaleDateString();
            return `${formattedDate}\nTotal Events: ${payload[0]?.payload?.totalEvents}`;
          }}
        />
        <Legend 
          verticalAlign="top" 
          align="center" 
          wrapperStyle={{ paddingBottom: 30 }}
          iconSize={15}
          onClick={(entry) => handleLegendClick(entry)}
          onMouseEnter={(entry) => setHoveredType(entry.value)}
          onMouseLeave={() => setHoveredType(null)}
        />
        {eventTypes.map((type, index) => (
          <Area
            key={type}
            type="monotone"
            dataKey={type}
            stackId="1"
            stroke={getColor(index)}
            fill={getColor(index)}
            fillOpacity={
              hoveredType === null && activeTypes.size === 0 ? 0.7 :
              hoveredType === type || activeTypes.has(type) ? 1.0 : 0.3
            }
            name={type}
            yAxisId="left"
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default ThemeRiver;
