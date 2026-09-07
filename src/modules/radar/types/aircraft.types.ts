/**
 * FlightSim - Radar Module Types
 * Subagent #6 - Радар Карта Ядро
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface AircraftTrailPoint extends LatLng {
  timestamp: number;
  alt: number;
}

export type AircraftStatus = 'enroute' | 'climbing' | 'descending' | 'holding' | 'emergency';

export interface Aircraft {
  id: string;
  callsign: string;
  icao24: string;
  lat: number;
  lng: number;
  altitude: number; // feet
  speed: number; // knots
  heading: number; // 0-360
  verticalRate: number; // ft/min
  squawk: string;
  aircraftType: string; // B738, A320 etc
  origin?: string; // ICAO
  destination?: string;
  status: AircraftStatus;
  lastUpdate: number;
  trail: AircraftTrailPoint[];
  onGround: boolean;
  selected?: boolean;
  // additional for realistic radar
  baroAltitude?: number;
  geoAltitude?: number;
}

export interface RadarAircraftMarker {
  aircraft: Aircraft;
  element?: HTMLDivElement;
  x?: number;
  y?: number;
}

export interface MapViewState {
  center: [number, number]; // [lng, lat] - MapLibre format
  zoom: number;
  bearing: number;
  pitch: number;
}

export const RADAR_DEFAULT_CENTER: [number, number] = [49.8, 40.4]; // Баку, Азербайджан [lng, lat]
export const RADAR_DEFAULT_ZOOM = 8.5;
export const RADAR_DEFAULT_BEARING = 0;
export const RADAR_DEFAULT_PITCH = 0;
