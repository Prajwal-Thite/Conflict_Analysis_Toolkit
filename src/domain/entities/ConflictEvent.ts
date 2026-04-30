import { Actor } from '../value-objects/Actor';
import { Location } from '../value-objects/Location';
import { EventType, FatalityLevel, SubEventType } from '../value-objects/EventType';

export type MarkerColor = 'red' | 'black' | 'gray';

export type SourceScale = 'National' | 'Subnational' | 'Regional' | 'International' | 'Other' | string;

export type DisorderType =
  | 'Political violence'
  | 'Demonstrations'
  | 'Strategic developments'
  | string;

/** Raw shape of a single record from complete_dataset.json */
export interface RawConflictEvent {
  readonly event_id_cnty: string;
  readonly event_date: string;
  readonly year: number;
  readonly time_precision: number;
  readonly disorder_type: DisorderType;
  readonly event_type: EventType;
  readonly sub_event_type: SubEventType;
  readonly actor1: string;
  readonly assoc_actor_1: string | null;
  readonly inter1: number;
  readonly actor2: string | null;
  readonly assoc_actor_2: string | null;
  readonly inter2: number;
  readonly interaction: number;
  readonly civilian_targeting: string | null;
  readonly iso: number;
  readonly region: string;
  readonly country: string;
  readonly admin1: string | null;
  readonly admin2: string | null;
  readonly admin3: string | null;
  readonly location: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly geo_precision: number;
  readonly source: string;
  readonly source_scale: SourceScale;
  readonly notes: string | null;
  readonly fatalities: number;
  readonly tags: string | null;
  readonly timestamp: number;
}

/** Domain entity used throughout the application */
export interface ConflictEvent {
  readonly id: string;
  readonly eventDate: string;
  readonly year: number;
  readonly timePrecision: number;
  readonly disorderType: DisorderType;
  readonly eventType: EventType;
  readonly subEventType: SubEventType;
  readonly actor1: Actor;
  readonly actor2: Actor | null;
  readonly interaction: number;
  readonly civilianTargeting: string | null;
  readonly iso: number;
  readonly location: Location;
  readonly source: string;
  readonly sourceScale: SourceScale;
  readonly notes: string | null;
  readonly fatalities: number;
  readonly fatalityLevel: FatalityLevel;
  readonly markerColor: MarkerColor;
  readonly tags: string | null;
  readonly timestamp: number;
}
