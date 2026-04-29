import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  CartesianGrid,
  TooltipProps,
} from 'recharts';
import { ConflictEvent } from '../../domain/entities/ConflictEvent';

interface ThemeRiverProps {
  data: ConflictEvent[];
}

interface Dimensions {
  height: number;
  width: number;
}

interface ProcessedDataPoint {
  event_date: string;
  totalEvents: number;
  [subEventType: string]: string | number;
}

interface LegendEntry {
  value: string;
}

const ThemeRiver: React.FC<ThemeRiverProps> = ({ data }) => {
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  const [hoveredType, setHoveredType] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<Dimensions>(() => ({
    height: window.innerHeight,
    width: window.innerWidth,
  }));

  useEffect(() => {
    const handleResize = (): void => {
      setDimensions({ height: window.innerHeight, width: window.innerWidth });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getChartHeight = (): number => {
    if (dimensions.height > 700) return 550;
    if (dimensions.height > 400) return 450;
    return 350;
  };

  const handleLegendClick = (entry: LegendEntry): void => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(entry.value)) {
        next.delete(entry.value);
      } else {
        next.add(entry.value);
      }
      return next;
    });
  };

  const processData = (): ProcessedDataPoint[] => {
    const sortedData = [...data].sort(
      (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
    );

    const eventsByDate = sortedData.reduce<
      Record<string, { totalEvents: number; rawCounts: Record<string, number> }>
    >((acc, event) => {
      const date = event.eventDate;
      if (!acc[date]) {
        acc[date] = { totalEvents: 0, rawCounts: {} };
      }
      acc[date].rawCounts[event.subEventType] = (acc[date].rawCounts[event.subEventType] ?? 0) + 1;
      acc[date].totalEvents += 1;
      return acc;
    }, {});

    return Object.entries(eventsByDate).map(([date, entry]) => {
      const result: ProcessedDataPoint = { event_date: date, totalEvents: entry.totalEvents };
      Object.entries(entry.rawCounts).forEach(([type, count]) => {
        result[type] = count / entry.totalEvents;
      });
      return result;
    });
  };

  const processedData = processData();
  const eventTypes = [...new Set(data.map((e) => e.subEventType))];
  const getColor = (index: number): string => `hsl(${index * (360 / eventTypes.length)}, 70%, 50%)`;

  const tooltipFormatter: TooltipProps<number, string>['formatter'] = (value, name, props) => {
    if (name === 'totalEvents') return null;
    const actualCount = Math.round((value as number) * (props.payload?.totalEvents as number));
    return [`${actualCount} events (${((value as number) * 100).toFixed(1)}%)`, name];
  };

  const labelFormatter = (date: string, payload: Array<{ payload?: ProcessedDataPoint }>): string => {
    const formattedDate = new Date(date).toLocaleDateString();
    return `${formattedDate}\nTotal Events: ${payload[0]?.payload?.totalEvents ?? 0}`;
  };

  return (
    <ResponsiveContainer width="100%" height={getChartHeight()}>
      <AreaChart
        data={processedData}
        margin={{
          top: dimensions.height > 1080 ? 50 : 30,
          right: 50,
          left: dimensions.height > 1080 ? 20 : 30,
          bottom: dimensions.height > 1080 ? 120 : 100,
        }}
        stackOffset="expand"
      >
        <XAxis
          dataKey="event_date"
          angle={-45}
          textAnchor="end"
          tickFormatter={(date: string) => new Date(date).toLocaleDateString()}
        />
        <Brush
          dataKey="event_date"
          height={30}
          y={dimensions.height > 700 ? 470 : 370}
          stroke="#8884d8"
        />
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <YAxis
          yAxisId="left"
          tickFormatter={(value: number) => `${(value * 100).toFixed(0)}%`}
          label={{ value: 'Event Distribution (%)', angle: -90, position: 'insideCenter', dx: -30 }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          dataKey="totalEvents"
          label={{ value: 'Total Events', angle: 90, position: 'insideRight' }}
        />
        <Tooltip formatter={tooltipFormatter} labelFormatter={labelFormatter} />
        <Legend
          verticalAlign="top"
          align="center"
          wrapperStyle={{ paddingBottom: 30 }}
          iconSize={15}
          onClick={(entry) => handleLegendClick(entry as LegendEntry)}
          onMouseEnter={(entry) => setHoveredType((entry as LegendEntry).value)}
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
              hoveredType === null && activeTypes.size === 0
                ? 0.7
                : hoveredType === type || activeTypes.has(type)
                ? 1.0
                : 0.3
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
