import 'leaflet';

declare module 'leaflet' {
  interface HeatLayerOptions {
    minOpacity?: number;
    maxZoom?: number;
    minZoom?: number;
    max?: number;
    radius?: number;
    blur?: number;
    gradient?: { [key: string]: string };
  }

  interface HeatLayer extends Layer {
    addTo(map: Map): this;
    setLatLngs(latlngs: Array<[number, number] | [number, number, number]>): this;
    addLatLng(latlng: [number, number] | [number, number, number]): this;
    setOptions(options: HeatLayerOptions): this;
    redraw(): this;
  }

  function heatLayer(
    latlngs: Array<[number, number] | [number, number, number]>,
    options?: HeatLayerOptions
  ): HeatLayer;

  interface MarkerOptions {
    properties?: Record<string, unknown>;
    totalFatalities?: number;
  }

  interface MarkerCluster extends Marker {
    getAllChildMarkers(): Marker[];
    getChildCount(): number;
  }

  interface Map {
    drawControl?: Control;
  }
}
