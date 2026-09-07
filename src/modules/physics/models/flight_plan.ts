/**
 * FlightSim Module 8 - Flight Plan Model
 * Waypoints, routes, procedures, fuel planning
 */

export type WaypointType = 'AIRPORT' | 'VOR' | 'NDB' | 'FIX' | 'GPS' | 'RUNWAY';
export type LegType = 'DIRECT' | 'TF' | 'CF' | 'DF' | 'HF' | 'HA' | 'HM' | 'IF' | 'FA';
export type AltConstraintType = 'AT' | 'AT_OR_ABOVE' | 'AT_OR_BELOW' | 'BETWEEN';

export interface Waypoint {
  id: string;                     // e.g. "SVO", "GALMI"
  name?: string;
  type: WaypointType;
  latitude: number;
  longitude: number;
  elevation_ft?: number;          // for airports
  frequencyMHz?: number;          // for VOR/NDB
  magVar?: number;
}

export interface AltitudeConstraint {
  type: AltConstraintType;
  alt1_ft: number;
  alt2_ft?: number;               // for BETWEEN
}

export interface SpeedConstraint {
  ias_kts: number;
  type: 'AT' | 'MAX' | 'MIN';
}

export interface RouteLeg {
  seq: number;
  from: Waypoint;
  to: Waypoint;
  legType: LegType;
  distance_nm: number;
  trackTrue_deg: number;
  trackMag_deg: number;
  altitudeConstraint?: AltitudeConstraint;
  speedConstraint?: SpeedConstraint;
  estimatedFuel_kg?: number;
  estimatedTime_s?: number;
  windComponent_kts?: number;
}

export interface FlightPlan {
  id: string;
  callsign: string;
  aircraftId: string;
  departure: Waypoint;            // airport
  arrival: Waypoint;
  alternate?: Waypoint;
  departureRunway?: string;       // e.g. "06L"
  arrivalRunway?: string;
  waypoints: Waypoint[];
  legs: RouteLeg[];
  cruiseAltitude_ft: number;
  cruiseMach?: number;
  cruiseTas_kts?: number;
  totalDistance_nm: number;
  totalTime_s: number;
  totalFuel_kg: number;
  createdAt: number;
  updatedAt: number;
  // Performance
  costIndex?: number;
  reserveFuel_kg?: number;
  contingencyFuel_kg?: number;
  payload_kg?: number;
}

export interface ActiveLegInfo {
  currentLegIndex: number;
  distanceToNext_nm: number;
  bearingToNext_deg: number;
  crossTrackError_nm: number;
  desiredTrack_deg: number;
  etaNext_s: number;
  etaDestination_s: number;
}

// Helpers
export function haversineDistanceNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R_NM = 3440.065; // Earth radius in NM
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R_NM * c;
}

export function bearingTrue(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const dLambda = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  const theta = Math.atan2(y, x);
  return (theta * 180 / Math.PI + 360) % 360;
}

export function buildLegsFromWaypoints(waypoints: Waypoint[]): RouteLeg[] {
  if (waypoints.length < 2) return [];
  const legs: RouteLeg[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i];
    const to = waypoints[i + 1];
    const dist = haversineDistanceNm(from.latitude, from.longitude, to.latitude, to.longitude);
    const trk = bearingTrue(from.latitude, from.longitude, to.latitude, to.longitude);
    legs.push({
      seq: i,
      from,
      to,
      legType: 'TF',
      distance_nm: dist,
      trackTrue_deg: trk,
      trackMag_deg: trk, // simplified, should subtract magVar
    });
  }
  return legs;
}

export function createFlightPlan(departure: Waypoint, arrival: Waypoint, intermediates: Waypoint[], cruiseAlt_ft: number, aircraftId: string, callsign: string): FlightPlan {
  const waypoints = [departure, ...intermediates, arrival];
  const legs = buildLegsFromWaypoints(waypoints);
  const totalDist = legs.reduce((s, l) => s + l.distance_nm, 0);
  return {
    id: `FP-${Date.now()}`,
    callsign,
    aircraftId,
    departure,
    arrival,
    waypoints,
    legs,
    cruiseAltitude_ft: cruiseAlt_ft,
    totalDistance_nm: totalDist,
    totalTime_s: 0,
    totalFuel_kg: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}
