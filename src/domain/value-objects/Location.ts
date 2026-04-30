export interface Location {
  readonly lat: number;
  readonly lng: number;
  readonly name: string;
  readonly region: string;
  readonly country: string;
  readonly admin1: string | null;
  readonly admin2: string | null;
  readonly admin3: string | null;
  readonly geoPrecision: number;
}
