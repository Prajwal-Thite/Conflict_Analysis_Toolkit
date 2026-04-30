import L from 'leaflet';
import { scaleOrdinal } from 'd3-scale';
import { schemeSet3 } from 'd3-scale-chromatic';
import moment from 'moment';

const createTriangleGlyph = (
  date: string,
  fatalities: number,
  sourceScale: number,
  subEventType: string
): L.DivIcon => {
  const colorScale = scaleOrdinal<string>(schemeSet3);
  const baseSize = 30;

  const startDate = moment('17 August 2024', 'DD MMMM YYYY');
  const endDate = moment('06 September 2024', 'DD MMMM YYYY');
  const currentDate = moment(date, 'DD MMMM YYYY');

  const dateDimension = (currentDate.diff(startDate) / endDate.diff(startDate)) * baseSize * 3;
  const fatalityDimension = Math.min(fatalities / 25, 1) * baseSize * 2.5;
  const scaleDimension = Math.min((sourceScale || 0) / 10, 1) * baseSize * 2;

  const svg = `
    <svg width="${baseSize * 4}" height="${baseSize * 4}" viewBox="0 0 ${baseSize * 4} ${baseSize * 4}">
      <polygon
        points="${baseSize},${baseSize - dateDimension}
                ${baseSize + fatalityDimension},${baseSize + scaleDimension}
                ${baseSize - fatalityDimension},${baseSize + scaleDimension}"
        fill="${colorScale(subEventType)}"
        stroke="black"
        stroke-width="1"
      />
      <text x="${baseSize}" y="${baseSize + scaleDimension + 25}"
            text-anchor="middle" fill="black" font-size="10">
        F:${fatalities} S:${sourceScale}
      </text>
    </svg>
  `;

  return L.divIcon({
    html: svg,
    className: 'triangle-glyph',
    iconSize: [baseSize * 2, baseSize * 2],
  });
};

export default createTriangleGlyph;
