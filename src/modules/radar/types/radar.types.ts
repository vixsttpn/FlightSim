/**
 * FlightSim Radar Types
 * Unified types for OpenSky, ADS-B and simulated traffic
 */

export interface BoundingBox {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export enum AircraftSource {
  OPENSKY = 'opensky',
  ADSB = 'adsb',
  SIMULATED = 'simulated',
  ADSB_LOL = 'adsb_lol',
  ADSB_FI = 'adsb_fi',
}

export enum AircraftCategory {
  UNKNOWN = 0,
  LIGHT = 1,
  SMALL = 2,
  LARGE = 3,
  HIGH_VORTEX_LARGE = 4,
  HEAVY = 5,
  HIGH_PERFORMANCE = 6,
  ROTORCRAFT = 7,
  GLIDER = 9,
  LIGHTER_THAN_AIR = 10,
  PARACHUTIST = 11,
  ULTRALIGHT = 12,
  UAS = 14,
  SPACE = 15,
  EMERGENCY_SURFACE = 17,
  SERVICE_SURFACE = 18,
  POINT_OBSTACLE = 19,
}

export interface UnifiedAircraft {
  /** ICAO24 hex address, lowercased */
  icao24: string;
  callsign: string | null;
  originCountry: string;
  /** seconds since epoch */
  timePosition: number | null;
  lastContact: number;
  longitude: number | null;
  latitude: number | null;
  baroAltitude: number | null; // meters
  onGround: boolean;
  velocity: number | null; // m/s
  trueTrack: number | null; // degrees 0-360
  verticalRate: number | null; // m/s
  geoAltitude: number | null;
  squawk: string | null;
  spi: boolean;
  category: AircraftCategory | number;
  source: AircraftSource;
  /** For merging */
  lastUpdate: number;
  /** Extra data */
  emitterType?: string;
  registration?: string;
  model?: string;

  /** Sim-only */
  isSim?: boolean;
  flightNumber?: string;
  destination?: string;
  origin?: string;
}

export interface RadarSnapshot {
  aircraft: UnifiedAircraft[];
  timestamp: number;
  sourceStats: {
    opensky: number;
    adsb: number;
    sim: number;
    total: number;
  };
}

export interface OpenSkyRawState {
  /** Original raw array from API doc */
  icao24: string;
  callsign: string | null;
  origin_country: string;
  time_position: number | null;
  last_contact: number;
  longitude: number | null;
  latitude: number | null;
  baro_altitude: number | null;
  on_ground: boolean;
  velocity: number | null;
  true_track: number | null;
  vertical_rate: number | null;
  sensors: number[] | null;
  geo_altitude: number | null;
  squawk: string | null;
  spi: boolean;
  position_source: number;
  category: number;
}

export interface OpenSkyResponse {
  time: number;
  states: any[] | null; // raw array of arrays
}

export interface AdsbRawAircraft {
  hex: string;
  flight?: string;
  alt_baro?: number | string;
  alt_geom?: number;
  gs?: number;
  ias?: number;
  tas?: number;
  track?: number;
  lat?: number;
  lon?: number;
  nic?: number;
  rc?: number;
  seen?: number;
  seen_pos?: number;
  squawk?: string;
  category?: string;
  r?: string; // registration
  t?: string; // model type
  type?: string;
  baro_rate?: number;
  geom_rate?: number;
  nav_qnh?: number;
  nav_altitude_mcp?: number;
  nav_heading?: number;
  emergency?: string;
  spi?: boolean;
  gnd?: boolean;
}

export interface TileCacheEntry {
  key: string; // z/x/y or full url
  z: number;
  x: number;
  y: number;
  url: string;
  blob: Blob;
  timestamp: number;
  size: number;
  hits: number;
}

export type MapStyleId = 'dark' | 'light' | 'satellite' | 'aeronautical' | 'terrain' | 'purple';

export interface MapStyleConfig {
  id: MapStyleId;
  name: string;
  description: string;
  tileUrl: string;
  tileUrlFallback?: string;
  attribution: string;
  maxZoom: number;
  minZoom: number;
  requiresApiKey?: boolean;
  background: string;
  aircraftIconColor: string;
  flightPathColor: string;
  radarGridColor: string;
  styleJsonUrl?: string;
}

export interface LiveFeedOptions {
  bbox?: BoundingBox;
  pollingIntervalMs?: number;
  enableOpenSky?: boolean;
  enableAdsb?: boolean;
  enableSim?: boolean;
  simCount?: number;
  deduplicate?: boolean;
  filterGround?: boolean;
  maxAircraft?: number;
}
