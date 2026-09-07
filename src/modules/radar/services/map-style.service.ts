/**
 * Map Style Service
 * Manages map tile styles for FlightSim radar
 * Supports OSM, Carto, Stadia + FlightSim purple brand
 */

import { MapStyleConfig, MapStyleId } from '../types/radar.types';

export const FLIGHTSIM_PURPLE = '#CC00CC';
export const FLIGHTSIM_PURPLE_DARK = '#990099';

const STYLES: Record<MapStyleId, MapStyleConfig> = {
  dark: {
    id: 'dark',
    name: 'Dark Matter',
    description: 'Тёмная тема для полётов ночью',
    tileUrl: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    tileUrlFallback: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    attribution: '&copy; OSM &copy; CARTO',
    maxZoom: 19,
    minZoom: 2,
    background: '#121212',
    aircraftIconColor: '#ffffff',
    flightPathColor: FLIGHTSIM_PURPLE,
    radarGridColor: '#333333',
  },
  light: {
    id: 'light',
    name: 'Light',
    description: 'Светлая классика OSM',
    tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    tileUrlFallback: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
    minZoom: 2,
    background: '#f5f5f3',
    aircraftIconColor: '#000000',
    flightPathColor: '#0066ff',
    radarGridColor: '#e0e0e0',
  },
  satellite: {
    id: 'satellite',
    name: 'Satellite',
    description: 'Esri World Imagery',
    tileUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar',
    maxZoom: 19,
    minZoom: 2,
    background: '#000000',
    aircraftIconColor: '#FFFF00',
    flightPathColor: '#00FF00',
    radarGridColor: 'rgba(255,255,255,0.15)',
  },
  aeronautical: {
    id: 'aeronautical',
    name: 'Aeronautical',
    description: 'OpenTopoMap авиационный',
    tileUrl: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    tileUrlFallback: 'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; OSM, SRTM',
    maxZoom: 17,
    minZoom: 2,
    background: '#d8e9d0',
    aircraftIconColor: '#000000',
    flightPathColor: FLIGHTSIM_PURPLE,
    radarGridColor: '#a0a0a0',
  },
  terrain: {
    id: 'terrain',
    name: 'Terrain',
    description: 'Рельеф + высоты, VFR',
    tileUrl: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap & OSM',
    maxZoom: 17,
    minZoom: 2,
    background: '#e8e6d9',
    aircraftIconColor: '#1a1a1a',
    flightPathColor: '#ff4400',
    radarGridColor: '#b0b0b0',
  },
  purple: {
    id: 'purple',
    name: 'FlightSim Purple',
    description: 'Фирменный пурпурный радар #CC00CC',
    tileUrl: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO & OSM | FlightSim Purple',
    maxZoom: 19,
    minZoom: 2,
    background: '#1a001a',
    aircraftIconColor: FLIGHTSIM_PURPLE,
    flightPathColor: FLIGHTSIM_PURPLE,
    radarGridColor: '#4d004d',
  },
};

function getMapLibreStyleJson(styleId: MapStyleId): any {
  const cfg = STYLES[styleId];
  return {
    version: 8,
    name: cfg.name,
    metadata: { 'flightsim:style': styleId },
    sources: {
      osm: {
        type: 'raster',
        tiles: [cfg.tileUrl.replace('{s}', 'a').replace('{r}', '')],
        tileSize: 256,
        attribution: cfg.attribution,
        maxzoom: cfg.maxZoom,
        minzoom: cfg.minZoom,
      },
    },
    layers: [{ id: 'osm-raster', type: 'raster', source: 'osm' }],
    _flightSim: {
      aircraftIconColor: cfg.aircraftIconColor,
      flightPathColor: cfg.flightPathColor,
      radarGridColor: cfg.radarGridColor,
      background: cfg.background,
    },
  };
}

class MapStyleService {
  private currentStyleId: MapStyleId;
  private listeners: Set<(style: MapStyleConfig) => void> = new Set();
  private static STORAGE_KEY = 'flightsim_map_style';

  constructor(defaultStyle: MapStyleId = 'dark') {
    const saved = this.loadSavedStyle();
    this.currentStyleId = saved ?? defaultStyle;
  }

  private loadSavedStyle(): MapStyleId | null {
    try {
      const raw = localStorage.getItem(MapStyleService.STORAGE_KEY);
      if (raw && raw in STYLES) return raw as MapStyleId;
    } catch {}
    return null;
  }

  private saveStyle(id: MapStyleId): void {
    try { localStorage.setItem(MapStyleService.STORAGE_KEY, id); } catch {}
  }

  getCurrentStyleId(): MapStyleId { return this.currentStyleId; }
  getCurrentStyle(): MapStyleConfig { return STYLES[this.currentStyleId]; }
  getStyle(id: MapStyleId): MapStyleConfig { return STYLES[id]; }
  listStyles(): MapStyleConfig[] { return Object.values(STYLES); }

  setStyle(id: MapStyleId): MapStyleConfig {
    if (!(id in STYLES)) throw new Error(`Unknown map style: ${id}`);
    this.currentStyleId = id;
    this.saveStyle(id);
    const cfg = STYLES[id];
    this.listeners.forEach((cb) => { try { cb(cfg); } catch {} });
    return cfg;
  }

  getMapLibreStyle(id?: MapStyleId): any {
    return getMapLibreStyleJson(id ?? this.currentStyleId);
  }

  getLeafletOptions(id?: MapStyleId): { url: string; options: any } {
    const cfg = STYLES[id ?? this.currentStyleId];
    return {
      url: cfg.tileUrl,
      options: {
        attribution: cfg.attribution,
        maxZoom: cfg.maxZoom,
        minZoom: cfg.minZoom,
        subdomains: 'abc',
        crossOrigin: true,
      },
    };
  }

  getCssVariables(id?: MapStyleId): Record<string, string> {
    const cfg = STYLES[id ?? this.currentStyleId];
    return {
      '--radar-bg': cfg.background,
      '--radar-aircraft-color': cfg.aircraftIconColor,
      '--radar-path-color': cfg.flightPathColor,
      '--radar-grid-color': cfg.radarGridColor,
      '--radar-brand': FLIGHTSIM_PURPLE,
      '--radar-brand-dark': FLIGHTSIM_PURPLE_DARK,
    };
  }

  onStyleChange(cb: (style: MapStyleConfig) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  getBrandPalette() {
    return {
      purple: FLIGHTSIM_PURPLE,
      purpleDark: FLIGHTSIM_PURPLE_DARK,
      purpleLight: '#ff66ff',
      purpleGlow: 'rgba(204, 0, 204, 0.3)',
      textOnPurple: '#ffffff',
    };
  }
}

export const mapStyleService = new MapStyleService();
export default MapStyleService;
