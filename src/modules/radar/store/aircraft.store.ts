/**
 * FlightSim Radar - Aircraft Store (Zustand)
 * Управляет списком самолетов, выделением, трейлами
 */
import { create } from 'zustand';
import { Aircraft, AircraftTrailPoint } from '../types/aircraft.types';

interface AircraftState {
  aircraft: Map<string, Aircraft>;
  selectedId: string | null;
  hoveredId: string | null;
  showTrails: boolean;
  trailHistoryLimit: number;
  isLive: boolean;

  // actions
  setAircraft: (list: Aircraft[]) => void;
  upsertAircraft: (ac: Aircraft) => void;
  removeAircraft: (id: string) => void;
  updatePosition: (id: string, lat: number, lng: number, heading: number, altitude?: number, speed?: number) => void;
  pushTrailPoint: (id: string, point: AircraftTrailPoint) => void;
  selectAircraft: (id: string | null) => void;
  setHovered: (id: string | null) => void;
  toggleTrails: () => void;
  setShowTrails: (v: boolean) => void;
  clearAll: () => void;
  getSelected: () => Aircraft | null;
  getArray: () => Aircraft[];
  tickSimulation: (dt: number) => void;
}

// Генератор фейковых данных для режима симуляции
function generateMockAircraft(count = 14): Aircraft[] {
  const types = ['B738', 'A320', 'B77W', 'A359', 'B789', 'A321', 'B38M'];
  const callsigns = ['AZAL', 'THY', 'AFL', 'UAE', 'QTR', 'SBI', 'AZN', 'TJK'];
  const origins = ['UBBB', 'UUDD', 'LTBA', 'OMDB', 'OTHH', 'ULLI'];
  const dests = ['EDDF', 'LTFM', 'LOWW', 'OMSJ', 'LIRF', 'EBBR'];

  const centerLat = 40.4;
  const centerLng = 49.8;

  return Array.from({ length: count }).map((_, i) => {
    const lat = centerLat + (Math.random() - 0.5) * 4;
    const lng = centerLng + (Math.random() - 0.5) * 6;
    const heading = Math.random() * 360;
    return {
      id: `ac_${i}_${Math.random().toString(36).slice(2, 6)}`,
      callsign: `${callsigns[Math.floor(Math.random() * callsigns.length)]}${Math.floor(Math.random() * 9000) + 100}`,
      icao24: Math.random().toString(16).slice(2, 8).toUpperCase(),
      lat,
      lng,
      altitude: Math.floor(8000 + Math.random() * 35000),
      speed: Math.floor(280 + Math.random() * 250),
      heading,
      verticalRate: (Math.random() > 0.7 ? (Math.random() - 0.5) * 2000 : 0),
      squawk: `${Math.floor(1000 + Math.random() * 7000)}`,
      aircraftType: types[Math.floor(Math.random() * types.length)],
      origin: origins[Math.floor(Math.random() * origins.length)],
      destination: dests[Math.floor(Math.random() * dests.length)],
      status: (['enroute', 'climbing', 'descending'] as const)[Math.floor(Math.random() * 3)],
      lastUpdate: Date.now(),
      trail: Array.from({ length: 20 }).map((__, k) => ({
        lat: lat - Math.cos((heading * Math.PI) / 180) * k * 0.03 - (Math.random() - 0.5) * 0.02,
        lng: lng - Math.sin((heading * Math.PI) / 180) * k * 0.03 - (Math.random() - 0.5) * 0.02,
        timestamp: Date.now() - k * 5000,
        alt: 8000 + Math.random() * 35000,
      })),
      onGround: false,
    };
  });
}

export const useAircraftStore = create<AircraftState>((set, get) => ({
  aircraft: new Map<string, Aircraft>(generateMockAircraft().map(a => [a.id, a])),
  selectedId: null,
  hoveredId: null,
  showTrails: true,
  trailHistoryLimit: 40,
  isLive: false,

  setAircraft: (list) =>
    set(() => ({
      aircraft: new Map(list.map(a => [a.id, a])),
    })),

  upsertAircraft: (ac) =>
    set(state => {
      const map = new Map(state.aircraft);
      const existing = map.get(ac.id);
      if (existing) {
        // merge trail
        const merged: Aircraft = {
          ...existing,
          ...ac,
          trail: ac.trail?.length ? ac.trail : existing.trail,
          lastUpdate: Date.now(),
        };
        map.set(ac.id, merged);
      } else {
        map.set(ac.id, { ...ac, lastUpdate: Date.now() });
      }
      return { aircraft: map };
    }),

  removeAircraft: (id) =>
    set(state => {
      const map = new Map(state.aircraft);
      map.delete(id);
      return { aircraft: map, selectedId: state.selectedId === id ? null : state.selectedId };
    }),

  updatePosition: (id, lat, lng, heading, altitude, speed) =>
    set(state => {
      const map = new Map(state.aircraft);
      const ac = map.get(id);
      if (!ac) return state;
      const updated: Aircraft = {
        ...ac,
        lat,
        lng,
        heading,
        altitude: altitude ?? ac.altitude,
        speed: speed ?? ac.speed,
        lastUpdate: Date.now(),
      };
      // add trail point
      const point: AircraftTrailPoint = { lat, lng, timestamp: Date.now(), alt: updated.altitude };
      const trail = [...ac.trail, point];
      if (trail.length > state.trailHistoryLimit) trail.shift();
      updated.trail = trail;
      map.set(id, updated);
      return { aircraft: map };
    }),

  pushTrailPoint: (id, point) =>
    set(state => {
      const map = new Map(state.aircraft);
      const ac = map.get(id);
      if (!ac) return state;
      const trail = [...ac.trail, point];
      if (trail.length > state.trailHistoryLimit) trail.shift();
      map.set(id, { ...ac, trail });
      return { aircraft: map };
    }),

  selectAircraft: (id) => set({ selectedId: id }),

  setHovered: (id) => set({ hoveredId: id }),

  toggleTrails: () => set(s => ({ showTrails: !s.showTrails })),
  setShowTrails: (v) => set({ showTrails: v }),

  clearAll: () => set({ aircraft: new Map(), selectedId: null, hoveredId: null }),

  getSelected: () => {
    const { aircraft, selectedId } = get();
    if (!selectedId) return null;
    return aircraft.get(selectedId) ?? null;
  },

  getArray: () => Array.from(get().aircraft.values()),

  // Простая симуляция движения для демо
  tickSimulation: (dt) => {
    set(state => {
      const map = new Map(state.aircraft);
      for (const [id, ac] of map) {
        if (ac.onGround) continue;
        // speed knots -> approximately degrees: 1 knot ~ 0.000277 deg/min? упростим
        // convert heading to movement
        const speedFactor = (ac.speed / 3600) * 0.008 * dt; // dt in seconds
        const rad = (ac.heading * Math.PI) / 180;
        const dLat = Math.cos(rad) * speedFactor;
        const dLng = Math.sin(rad) * speedFactor / Math.cos((ac.lat * Math.PI) / 180);
        const newLat = ac.lat + dLat;
        const newLng = ac.lng + dLng;
        const trailPoint: AircraftTrailPoint = { lat: ac.lat, lng: ac.lng, timestamp: Date.now(), alt: ac.altitude };
        const trail = [...ac.trail, trailPoint];
        if (trail.length > state.trailHistoryLimit) trail.shift();
        // occasional heading jitter
        const newHeading = ac.heading + (Math.random() - 0.5) * 0.3;
        map.set(id, { ...ac, lat: newLat, lng: newLng, heading: (newHeading + 360) % 360, trail, lastUpdate: Date.now() });
      }
      return { aircraft: map };
    });
  },
}));
