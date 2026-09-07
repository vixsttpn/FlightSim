/**
 * Live Feed Service
 * Объединяет реальные (OpenSky + ADS-B) и симулированные данные
 * - Дедупликация по icao24
 * - Приоритет: ADSB > OpenSky > Sim
 * - Поллинг + Event Emitter + Sim traffic generator
 */

import {
  BoundingBox,
  UnifiedAircraft,
  AircraftSource,
  RadarSnapshot,
  LiveFeedOptions,
} from '../types/radar.types';
import { openskyService } from './opensky.service';
import { adsbService } from './adsb.service';
import OpenSkyService from './opensky.service';
import AdsbService from './adsb.service';

type Listener = (snapshot: RadarSnapshot) => void;
type ErrorListener = (error: Error) => void;

const DEFAULT_BBOX_MOSCOW: BoundingBox = {
  lamin: 54.5,
  lomin: 36.5,
  lamax: 56.5,
  lomax: 38.5,
};

const DEFAULT_BBOX_WORLD: BoundingBox = {
  lamin: -90,
  lomin: -180,
  lamax: 90,
  lomax: 180,
};

class LiveFeedService {
  private options: Required<LiveFeedOptions>;
  private listeners: Set<Listener> = new Set();
  private errorListeners: Set<ErrorListener> = new Set();
  private pollingTimer: number | null = null;
  private simTimer: number | null = null;
  private isRunning = false;
  private lastSnapshot: RadarSnapshot | null = null;

  // cache for interpolation
  private aircraftMap: Map<string, UnifiedAircraft> = new Map();
  private simAircraft: Map<string, UnifiedAircraft> = new Map();

  constructor(options: LiveFeedOptions = {}) {
    this.options = {
      bbox: options.bbox ?? DEFAULT_BBOX_MOSCOW,
      pollingIntervalMs: options.pollingIntervalMs ?? 8000,
      enableOpenSky: options.enableOpenSky ?? true,
      enableAdsb: options.enableAdsb ?? true,
      enableSim: options.enableSim ?? true,
      simCount: options.simCount ?? 8,
      deduplicate: options.deduplicate ?? true,
      filterGround: options.filterGround ?? false,
      maxAircraft: options.maxAircraft ?? 300,
    };

    if (this.options.enableSim) {
      this.generateSimTraffic(this.options.simCount);
    }
  }

  /**
   * Deduplication & merging strategy:
   * priority: ADSB > OpenSky > Sim
   * If same icao24 exists, keep newest + higher priority source
   */
  private mergeAircraft(
    opensky: UnifiedAircraft[],
    adsb: UnifiedAircraft[],
    sim: UnifiedAircraft[]
  ): UnifiedAircraft[] {
    const merged = new Map<string, UnifiedAircraft>();

    const addWithPriority = (ac: UnifiedAircraft, priority: number) => {
      const key = ac.icao24.toLowerCase();
      const existing = merged.get(key);
      if (!existing) {
        (ac as any)._priority = priority;
        merged.set(key, ac);
        return;
      }
      const existingPriority = (existing as any)._priority ?? 0;
      if (priority > existingPriority) {
        (ac as any)._priority = priority;
        merged.set(key, ac);
      } else if (priority === existingPriority) {
        // newest wins
        if (ac.lastUpdate > existing.lastUpdate) {
          merged.set(key, ac);
        }
      }
      // else keep existing
    };

    // lowest priority sim
    for (const ac of sim) addWithPriority(ac, 0);
    for (const ac of opensky) addWithPriority(ac, 1);
    for (const ac of adsb) addWithPriority(ac, 2);

    let arr = Array.from(merged.values());

    if (this.options.filterGround) {
      arr = arr.filter((a) => !a.onGround);
    }

    // trim
    if (arr.length > this.options.maxAircraft) {
      arr.sort((a, b) => {
        // prefer airborne + higher altitude
        const scoreA = (a.onGround ? 0 : 1000) + (a.baroAltitude ?? 0) / 100;
        const scoreB = (b.onGround ? 0 : 1000) + (b.baroAltitude ?? 0) / 100;
        return scoreB - scoreA;
      });
      arr = arr.slice(0, this.options.maxAircraft);
    }

    // cleanup internal priority field
    for (const ac of arr) delete (ac as any)._priority;

    return arr;
  }

  private async fetchReal(): Promise<{ opensky: UnifiedAircraft[]; adsb: UnifiedAircraft[] }> {
    const bbox = this.options.bbox;
    const results = await Promise.allSettled([
      this.options.enableOpenSky ? openskyService.fetchStates(bbox).catch(() => OpenSkyService.generateMock(bbox, 20)) : Promise.resolve([]),
      this.options.enableAdsb ? adsbService.fetchAircraft(bbox).catch(() => AdsbService.generateMock(bbox, 15)) : Promise.resolve([]),
    ]);

    const opensky = results[0].status === 'fulfilled' ? results[0].value : [];
    const adsb = results[1].status === 'fulfilled' ? results[1].value : [];

    if (results[0].status === 'rejected') {
      this.emitError(new Error(`OpenSky failed: ${results[0].reason}`));
    }
    if (results[1].status === 'rejected') {
      this.emitError(new Error(`ADSB failed: ${results[1].reason}`));
    }

    return { opensky, adsb };
  }

  private generateSimTraffic(count: number): void {
    const bbox = this.options.bbox;
    this.simAircraft.clear();

    const airlines = ['FSS', 'SIM', 'FLT', 'TST'];
    for (let i = 0; i < count; i++) {
      const icao = `f${(i + 100).toString(16).padStart(5, '0')}`; // sim icao starts with f
      const lat = bbox.lamin + Math.random() * (bbox.lamax - bbox.lamin);
      const lon = bbox.lomin + Math.random() * (bbox.lomax - bbox.lomin);
      const airline = airlines[Math.floor(Math.random() * airlines.length)];

      const ac: UnifiedAircraft = {
        icao24: icao,
        callsign: `${airline}${100 + i}`,
        originCountry: 'FlightSim',
        timePosition: Math.floor(Date.now() / 1000),
        lastContact: Math.floor(Date.now() / 1000),
        longitude: lon,
        latitude: lat,
        baroAltitude: 500 + Math.random() * 8000,
        onGround: Math.random() < 0.15,
        velocity: 80 + Math.random() * 120,
        trueTrack: Math.random() * 360,
        verticalRate: (Math.random() - 0.5) * 8,
        geoAltitude: 600 + Math.random() * 8000,
        squawk: '1200',
        spi: false,
        category: 5,
        source: AircraftSource.SIMULATED,
        lastUpdate: Date.now(),
        isSim: true,
        model: ['B738', 'A320', 'C172', 'B77W'][Math.floor(Math.random() * 4)],
        origin: 'UUEE',
        destination: 'UUDD',
      };

      this.simAircraft.set(icao, ac);
    }
  }

  /**
   * Moves sim aircraft realistically
   */
  private tickSim(dtSeconds: number): UnifiedAircraft[] {
    const updated: UnifiedAircraft[] = [];
    for (const [key, ac] of this.simAircraft.entries()) {
      if (ac.onGround) continue;
      if (ac.latitude === null || ac.longitude === null || ac.velocity === null || ac.trueTrack === null) continue;

      // simple great-circle approximation: 1 degree lat ~ 111km
      const speedMps = ac.velocity; // already m/s
      const distMeters = speedMps * dtSeconds;
      const latRad = (ac.latitude * Math.PI) / 180;
      const metersPerDegLat = 111000;
      const metersPerDegLon = 111000 * Math.cos(latRad);

      const trackRad = (ac.trueTrack * Math.PI) / 180;
      const dLat = (distMeters * Math.cos(trackRad)) / metersPerDegLat;
      const dLon = (distMeters * Math.sin(trackRad)) / metersPerDegLon;

      let newLat = ac.latitude + dLat;
      let newLon = ac.longitude + dLon;

      // wrap inside bbox (bounce)
      const bbox = this.options.bbox;
      let newTrack = ac.trueTrack;
      if (newLat < bbox.lamin || newLat > bbox.lamax) {
        newTrack = 360 - newTrack;
        newLat = Math.max(bbox.lamin, Math.min(bbox.lamax, newLat));
      }
      if (newLon < bbox.lomin || newLon > bbox.lomax) {
        newTrack = (180 - newTrack + 360) % 360;
        newLon = Math.max(bbox.lomin, Math.min(bbox.lomax, newLon));
      }

      // small random track drift
      newTrack = (newTrack + (Math.random() - 0.5) * 2 + 360) % 360;

      const next: UnifiedAircraft = {
        ...ac,
        latitude: newLat,
        longitude: newLon,
        trueTrack: newTrack,
        lastUpdate: Date.now(),
        baroAltitude: ac.baroAltitude! + (Math.random() - 0.5) * 20,
      };

      this.simAircraft.set(key, next);
      updated.push(next);
    }
    return Array.from(this.simAircraft.values());
  }

  async fetchNow(): Promise<RadarSnapshot> {
    try {
      const { opensky, adsb } = await this.fetchReal();
      const sim = this.options.enableSim ? Array.from(this.simAircraft.values()) : [];

      const merged = this.mergeAircraft(opensky, adsb, sim);

      // update cache
      for (const ac of merged) {
        this.aircraftMap.set(ac.icao24, ac);
      }

      const snapshot: RadarSnapshot = {
        aircraft: merged,
        timestamp: Date.now(),
        sourceStats: {
          opensky: opensky.length,
          adsb: adsb.length,
          sim: sim.length,
          total: merged.length,
        },
      };

      this.lastSnapshot = snapshot;
      this.notify(snapshot);
      return snapshot;
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      this.emitError(err);
      // return last or empty
      if (this.lastSnapshot) return this.lastSnapshot;

      // fallback mocks
      const bbox = this.options.bbox;
      const mockOpen = OpenSkyService.generateMock(bbox, 12);
      const mockAdsb = AdsbService.generateMock(bbox, 8);
      const mockSim = Array.from(this.simAircraft.values());
      const merged = this.mergeAircraft(mockOpen, mockAdsb, mockSim);
      const snap: RadarSnapshot = {
        aircraft: merged,
        timestamp: Date.now(),
        sourceStats: { opensky: mockOpen.length, adsb: mockAdsb.length, sim: mockSim.length, total: merged.length },
      };
      this.lastSnapshot = snap;
      this.notify(snap);
      return snap;
    }
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // immediate fetch
    this.fetchNow().catch(() => {});

    // polling real sources
    this.pollingTimer = window.setInterval(() => {
      this.fetchNow().catch(() => {});
    }, this.options.pollingIntervalMs);

    // sim tick every 1s for smooth animation
    this.simTimer = window.setInterval(() => {
      if (!this.options.enableSim) return;
      const simTicked = this.tickSim(1);
      if (this.lastSnapshot) {
        // re-merge with last real but using updated sim
        const real = this.lastSnapshot.aircraft.filter((a) => a.source !== AircraftSource.SIMULATED);
        const open = real.filter((a) => a.source === AircraftSource.OPENSKY);
        const adsb = real.filter((a) => a.source !== AircraftSource.ADSB && a.source !== AircraftSource.ADSB_LOL && a.source !== AircraftSource.ADSB_FI ? [] : a);
        // actually simpler: reconstruct from cached map without sim
        const merged = this.mergeAircraft(open, adsb.length ? adsb : real, simTicked);
        const snap: RadarSnapshot = {
          aircraft: merged,
          timestamp: Date.now(),
          sourceStats: this.lastSnapshot.sourceStats,
        };
        this.notify(snap);
      }
    }, 1000);

    console.log('[LiveFeed] started', this.options);
  }

  stop(): void {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    if (this.simTimer) clearInterval(this.simTimer);
    this.pollingTimer = null;
    this.simTimer = null;
    this.isRunning = false;
    console.log('[LiveFeed] stopped');
  }

  setBbox(bbox: BoundingBox): void {
    this.options.bbox = bbox;
    // regenerate sim for new area
    if (this.options.enableSim) {
      this.generateSimTraffic(this.options.simCount);
    }
    // trigger fetch
    if (this.isRunning) this.fetchNow().catch(() => {});
  }

  getBbox(): BoundingBox {
    return this.options.bbox;
  }

  getSnapshot(): RadarSnapshot | null {
    return this.lastSnapshot;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    // immediate push if we have data
    if (this.lastSnapshot) {
      try {
        listener(this.lastSnapshot);
      } catch {}
    }
    return () => this.listeners.delete(listener);
  }

  onError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  private notify(snapshot: RadarSnapshot): void {
    this.listeners.forEach((cb) => {
      try {
        cb(snapshot);
      } catch (e) {
        console.warn('[LiveFeed] listener error', e);
      }
    });
  }

  private emitError(err: Error): void {
    this.errorListeners.forEach((cb) => {
      try {
        cb(err);
      } catch {}
    });
  }

  updateOptions(opts: Partial<LiveFeedOptions>): void {
    this.options = { ...this.options, ...opts } as Required<LiveFeedOptions>;
    if (opts.bbox) this.setBbox(opts.bbox);
  }

  isLive(): boolean {
    return this.isRunning;
  }

  getStats() {
    return {
      isRunning: this.isRunning,
      aircraftCount: this.lastSnapshot?.aircraft.length ?? 0,
      ...this.lastSnapshot?.sourceStats,
      bbox: this.options.bbox,
      lastUpdate: this.lastSnapshot?.timestamp ?? null,
    };
  }

  dispose(): void {
    this.stop();
    this.listeners.clear();
    this.errorListeners.clear();
    this.aircraftMap.clear();
  }
}

// Singleton for app-wide radar
export const liveFeedService = new LiveFeedService({
  bbox: DEFAULT_BBOX_MOSCOW,
  pollingIntervalMs: 10000,
  enableOpenSky: true,
  enableAdsb: true,
  enableSim: true,
  simCount: 10,
});

export const WORLD_BBOX = DEFAULT_BBOX_WORLD;
export const MOSCOW_BBOX = DEFAULT_BBOX_MOSCOW;
export default LiveFeedService;
