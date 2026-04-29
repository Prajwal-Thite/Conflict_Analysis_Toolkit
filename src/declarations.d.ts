declare module 'd3-cloud' {
  interface Word {
    text?: string;
    size?: number;
    x?: number;
    y?: number;
    rotate?: number;
    font?: string;
    padding?: number;
  }

  interface CloudLayout<T extends Word> {
    start(): this;
    size(): [number, number];
    size(size: [number, number]): this;
    words(): T[];
    words(words: T[]): this;
    padding(): number;
    padding(padding: number | ((d: T) => number)): this;
    rotate(): (d: T) => number;
    rotate(rotate: (d: T) => number): this;
    font(): string;
    font(font: string | ((d: T) => string)): this;
    fontSize(): (d: T) => number;
    fontSize(size: number | ((d: T) => number)): this;
    spiral(): string;
    spiral(spiral: string): this;
    text(): (d: T) => string;
    text(text: string | ((d: T) => string)): this;
    random(): () => number;
    random(random: () => number): this;
    on(type: 'end', listener: (words: T[]) => void): this;
    on(type: 'word', listener: (word: T) => void): this;
  }

  function cloud<T extends Word = Word>(): CloudLayout<T>;
  export = cloud;
}

declare module 'leaflet.heat' {
  export = {};
}

declare module 'react-leaflet-markercluster' {
  import { ComponentType, ReactNode } from 'react';
  type MarkerClusterGroupProps = { children?: ReactNode } & Record<string, unknown>;
  const MarkerClusterGroup: ComponentType<MarkerClusterGroupProps>;
  export default MarkerClusterGroup;
}
