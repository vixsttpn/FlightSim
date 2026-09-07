/**
 * FlightSim Radar - Map Store (Zustand)
 * Состояние карты, сетка, свип, контролы
 */
import { create } from 'zustand';
import { MapViewState, RADAR_DEFAULT_CENTER, RADAR_DEFAULT_ZOOM, RADAR_DEFAULT_BEARING, RADAR_DEFAULT_PITCH } from '../types/aircraft.types';

interface MapStore extends MapViewState {
  isMapLoaded: boolean;
  showGrid: boolean;
  showSweep: boolean;
  showAircraft: boolean;
  showTrails: boolean;
  sweepAngle: number; // 0-360 degrees for animation
  sweepSpeed: number; // deg per frame / per second
  radarRangeNm: number; // range in nautical miles
  isDarkTheme: boolean;
  followSelected: boolean;
  lastInteraction: number;

  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  setBearing: (bearing: number) => void;
  setPitch: (pitch: number) => void;
  setViewState: (vs: Partial<MapViewState>) => void;
  setMapLoaded: (v: boolean) => void;
  toggleGrid: () => void;
  toggleSweep: () => void;
  toggleAircraft: () => void;
  toggleTrails: () => void;
  setRadarRange: (nm: number) => void;
  setSweepAngle: (angle: number) => void;
  advanceSweep: (dt: number) => void; // dt ms
  recenter: () => void;
  reset: () => void;
}

export const useMapStore = create<MapStore>((set, get) => ({
  center: [...RADAR_DEFAULT_CENTER] as [number, number],
  zoom: RADAR_DEFAULT_ZOOM,
  bearing: RADAR_DEFAULT_BEARING,
  pitch: RADAR_DEFAULT_PITCH,
  isMapLoaded: false,
  showGrid: true,
  showSweep: true,
  showAircraft: true,
  showTrails: true,
  sweepAngle: 0,
  sweepSpeed: 0.8, // deg per tick scaled
  radarRangeNm: 250,
  isDarkTheme: true,
  followSelected: false,
  lastInteraction: Date.now(),

  setCenter: (center) => set({ center, lastInteraction: Date.now() }),
  setZoom: (zoom) => set({ zoom, lastInteraction: Date.now() }),
  setBearing: (bearing) => set({ bearing }),
  setPitch: (pitch) => set({ pitch }),
  setViewState: (vs) => set({ ...vs, lastInteraction: Date.now() }),
  setMapLoaded: (v) => set({ isMapLoaded: v }),

  toggleGrid: () => set(s => ({ showGrid: !s.showGrid })),
  toggleSweep: () => set(s => ({ showSweep: !s.showSweep })),
  toggleAircraft: () => set(s => ({ showAircraft: !s.showAircraft })),
  toggleTrails: () => set(s => ({ showTrails: !s.showTrails })),

  setRadarRange: (nm) => set({ radarRangeNm: nm }),
  setSweepAngle: (angle) => set({ sweepAngle: angle % 360 }),

  advanceSweep: (dt) => {
    const { sweepSpeed, sweepAngle } = get();
    // dt ms, speed factor: convert to deg
    const inc = sweepSpeed * (dt / 16.6); // normalized to 60fps
    set({ sweepAngle: (sweepAngle + inc) % 360 });
  },

  recenter: () => set({
    center: [...RADAR_DEFAULT_CENTER] as [number, number],
    zoom: RADAR_DEFAULT_ZOOM,
    bearing: RADAR_DEFAULT_BEARING,
    pitch: RADAR_DEFAULT_PITCH,
    lastInteraction: Date.now(),
  }),

  reset: () => set({
    center: [...RADAR_DEFAULT_CENTER] as [number, number],
    zoom: RADAR_DEFAULT_ZOOM,
    bearing: RADAR_DEFAULT_BEARING,
    pitch: RADAR_DEFAULT_PITCH,
    showGrid: true,
    showSweep: true,
    showAircraft: true,
    showTrails: true,
    sweepAngle: 0,
    radarRangeNm: 250,
    isDarkTheme: true,
  }),
}));
