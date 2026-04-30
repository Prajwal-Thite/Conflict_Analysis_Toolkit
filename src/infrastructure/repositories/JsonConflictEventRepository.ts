import { ConflictEvent, MarkerColor, RawConflictEvent } from '../../domain/entities/ConflictEvent';
import { IConflictEventRepository } from '../../domain/repositories/IConflictEventRepository';
import { getFatalityLevel } from '../../domain/value-objects/EventType';

const DATASET_LOCAL = `${process.env.PUBLIC_URL}/complete_dataset.json`;
const DATASET_REMOTE =
  'https://prajwal-thite.github.io/Conflict_Analysis_Toolkit/complete_dataset.json';

function resolveMarkerColor(iso: number): MarkerColor {
  if (iso === 643) return 'red';
  if (iso === 804) return 'black';
  return 'gray';
}

function mapToDomain(raw: RawConflictEvent): ConflictEvent {
  return {
    id: raw.event_id_cnty,
    eventDate: raw.event_date,
    year: raw.year,
    timePrecision: raw.time_precision,
    disorderType: raw.disorder_type,
    eventType: raw.event_type,
    subEventType: raw.sub_event_type,
    actor1: {
      name: raw.actor1,
      associatedActor: raw.assoc_actor_1,
      interCode: raw.inter1,
    },
    actor2: raw.actor2
      ? { name: raw.actor2, associatedActor: raw.assoc_actor_2, interCode: raw.inter2 }
      : null,
    interaction: raw.interaction,
    civilianTargeting: raw.civilian_targeting,
    iso: raw.iso,
    location: {
      lat: raw.latitude,
      lng: raw.longitude,
      name: raw.location,
      region: raw.region,
      country: raw.country,
      admin1: raw.admin1,
      admin2: raw.admin2,
      admin3: raw.admin3,
      geoPrecision: raw.geo_precision,
    },
    source: raw.source,
    sourceScale: raw.source_scale,
    notes: raw.notes,
    fatalities: raw.fatalities,
    fatalityLevel: getFatalityLevel(raw.fatalities),
    markerColor: resolveMarkerColor(raw.iso),
    tags: raw.tags,
    timestamp: raw.timestamp,
  };
}

export class JsonConflictEventRepository implements IConflictEventRepository {
  private cache: ConflictEvent[] | null = null;

  async getAll(): Promise<ConflictEvent[]> {
    if (this.cache) return this.cache;

    let raw: RawConflictEvent[];

    try {
      const response = await fetch(DATASET_LOCAL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      raw = await response.json();
    } catch {
      const fallback = await fetch(DATASET_REMOTE);
      raw = await fallback.json();
    }

    this.cache = raw.map(mapToDomain);
    return this.cache;
  }
}
