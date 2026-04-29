export type EventType =
  | 'Battles'
  | 'Explosions/Remote violence'
  | 'Violence against civilians'
  | 'Protests'
  | 'Riots'
  | 'Strategic developments';

export type SubEventType =
  | 'Armed clash'
  | 'Attack'
  | 'Air/drone strike'
  | 'Shelling/artillery/missile attack'
  | 'Remote explosive/landmine/IED'
  | 'Suicide bomb'
  | 'Chemical weapon'
  | 'Car bomb'
  | 'Grenade'
  | 'Abduction/forced disappearance'
  | 'Sexual violence'
  | 'Disrupted weapons use'
  | 'Peaceful protest'
  | 'Protest with intervention'
  | 'Excessive force against protesters'
  | 'Violent demonstration'
  | 'Mob violence'
  | 'Looting/property destruction'
  | 'Government regains territory'
  | 'Non-violent transfer of territory'
  | 'Headquarters or base established'
  | 'Agreement'
  | 'Arrests'
  | 'Change to group/activity'
  | 'Convoy/patrol'
  | string;

export type FatalityLevel = 'Low' | 'Medium' | 'High';

export type InteractionCode = string;

export function getFatalityLevel(fatalities: number): FatalityLevel {
  if (fatalities <= 5) return 'Low';
  if (fatalities <= 20) return 'Medium';
  return 'High';
}
