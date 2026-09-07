/**
 * ADS-B Service
 * Supports multiple free sources:
 * - adsb.lol https://api.adsb.lol/v2/mil (open, no key)
 * - adsb.fi   (similar)
 * - dump1090 local http://localhost:8080/data.json
 * - FlightSim internal sim bridge
 *
 * Normalizes to UnifiedAircraft
 */

import {
  BoundingBox,
  UnifiedAircraft,
  AircraftSource,
  AdsbRawAircraft,
} from '../types/radar.types';

export interface AdsbServiceConfig {
  baseUrl?: string;
  source?: 'adsb.lol' | 'adsb.fi' | 'dump1090' | 'custom';
  customUrl?: string;
  timeoutMs?: number;
  localUrl?: string;
}

const DEFAULT_BBOX_EU: BoundingBox = {
  lamin: 35,
  lomin: -10,
  lamax: 70,
  lomax: 40,
};

class AdsbService {
  private config: Required<AdsbServiceConfig>;
  private lastFetch = 0;

  constructor(cfg: AdsbServiceConfig = {}) {
    this.config = {
      baseUrl: cfg.baseUrl ?? 'https://api.adsb.lol',
      source: cfg.source ?? 'adsb.lol',
      customUrl: cfg.customUrl ?? '',
      timeoutMs: cfg.timeoutMs ?? 8000,
      localUrl: cfg.localUrl ?? 'http://localhost:8080/data/aircraft.json',
    };
  }

  private getSourceEnum(): AircraftSource {
    switch (this.config.source) {
      case 'adsb.fi':
        return AircraftSource.ADSB_FI;
      case 'adsb.lol':
        return AircraftSource.ADSB_LOL;
      default:
        return AircraftSource.ADSB;
    }
  }

  private async fetchJson(url: string, retries = 1): Promise<any> {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(t);
      if (!res.ok) throw new Error(`ADSB HTTP ${res.status}`);
      return await res.json();
    } catch (e: any) {
      clearTimeout(t);
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, 1000));
        return this.fetchJson(url, retries - 1);
      }
      throw e;
    }
  }

  static normalizeAircraft(raw: AdsbRawAircraft, source: AircraftSource): UnifiedAircraft | null {
    if (!raw.hex) return null;
    // raw.lat/lon may be undefined if no position
    if (raw.lat === undefined || raw.lon === undefined) return null;
    if (isNaN(raw.lat) || isNaN(raw.lon)) return null;

    const altB = typeof raw.alt_baro === 'string' ? (raw.alt_baro === 'ground' ? 0 : parseFloat(raw.alt_baro)) : raw.alt_baro;
    const baro = typeof altB === 'number' && !isNaN(altB) ? altB * 0.3048 : null; // feet to meters
    const geoAlt = raw.alt_geom !== undefined ? raw.alt_geom * 0.3048 : null;
    const velocity = raw.gs !== undefined ? raw.gs * 0.514444 : null; // knots to m/s
    const isGround = !!raw.gnd || raw.alt_baro === 'ground';

    return {
      icao24: raw.hex.toLowerCase(),
      callsign: raw.flight?.trim() || null,
      originCountry: 'Unknown',
      timePosition: raw.seen_pos !== undefined ? Math.floor(Date.now() / 1000 - raw.seen_pos) : Math.floor(Date.now() / 1000),
      lastContact: Math.floor(Date.now() / 1000 - (raw.seen ?? 0)),
      longitude: raw.lon,
      latitude: raw.lat,
      baroAltitude: isGround ? 0 : baro,
      onGround: isGround,
      velocity: velocity,
      trueTrack: raw.track ?? null,
      verticalRate: raw.baro_rate !== undefined ? raw.baro_rate * 0.00508 : null, // fpm to m/s
      geoAltitude: geoAlt,
      squawk: raw.squawk ?? null,
      spi: !!raw.spi,
      category: raw.category ? (parseInt(raw.category, 10) as any) : 0,
      source,
      lastUpdate: Date.now(),
      registration: raw.r,
      model: raw.t,
      isSim: false,
    };
  }

  /**
   * Fetch from adsb.lol using bounding box
   * API: /v2/lat/{lat}/lon/{lon}/dist/{dist}  or /v2/bbox/lamin/lomin/lamax/lomax
   * We'll try bbox if supported, otherwise lat/lon/dist
   */
  async fetchAdsbLol(bbox?: BoundingBox): Promise<UnifiedAircraft[]> {
    const b = bbox ?? DEFAULT_BBOX_EU;

    // adsb.lol supports /v2/bbox/{lamin},{lomin},{lamax},{lomax}? actually format may vary
    // Try two endpoint patterns
    const attempts: string[] = [
      `${this.config.baseUrl}/v2/lat/${((b.lamin + b.lamax) / 2).toFixed(4)}/lon/${((b.lomin + b.lomax) / 2).toFixed(4)}/dist/250`,
      `${this.config.baseUrl}/v2/bbox/${b.lamin},${b.lomin},${b.lamax},${b.lomax}`,
      `${this.config.baseUrl}/v2/all`,
    ];

    let data: any = null;
    let lastError: any = null;

    for (const url of attempts) {
      try {
        data = await this.fetchJson(url, 0);
        if (data) break;
      } catch (e) {
        lastError = e;
        continue;
      }
    }

    if (!data) {
      // console.warn('[ADSB] all endpoints failed', lastError);
      throw lastError ?? new Error('ADSB_FETCH_FAILED');
    }

    // Format: { ac: [] } or array?
    const acList: AdsbRawAircraft[] = data.ac ?? data.aircraft ?? (Array.isArray(data) ? data : []);

    const out: UnifiedAircraft[] = [];
    for (const raw of acList) {
      const norm = AdsbService.normalizeAircraft(raw, this.getSourceEnum());
      if (norm) {
        // extra bbox filtering if we used dist endpoint
        if (bbox) {
          if (
            norm.latitude! < bbox.lamin ||
            norm.latitude! > bbox.lamax ||
            norm.longitude! < bbox.lomin ||
            norm.longitude! > bbox.lomax
          ) {
            continue;
          }
        }
        out.push(norm);
      }
    }

    this.lastFetch = Date.now();
    return out;
  }

  /**
   * Fetch from local dump1090 (if user runs own receiver)
   */
  async fetchDump1090(): Promise<UnifiedAircraft[]> {
    const data = await this.fetchJson(this.config.localUrl);
    const acList: AdsbRawAircraft[] = data.aircraft ?? data.ac ?? [];
    return acList
      .map((r) => AdsbService.normalizeAircraft(r, AircraftSource.ADSB))
      .filter(Boolean) as UnifiedAircraft[];
  }

  /**
   * Public unified fetch
   */
  async fetchAircraft(bbox?: BoundingBox): Promise<UnifiedAircraft[]> {
    switch (this.config.source) {
      case 'dump1090':
        return this.fetchDump1090();
      case 'adsb.fi':
      case 'adsb.lol':
      default:
        return this.fetchAdsbLol(bbox);
    }
  }

  /**
   * Fetch by registration / callsign filter
   */
  async fetchByCallsign(callsign: string, bbox?: BoundingBox): Promise<UnifiedAircraft[]> {
    const all = await this.fetchAircraft(bbox);
    const needle = callsign.toUpperCase().trim();
    return all.filter((a) => a.callsign?.toUpperCase().includes(needle));
  }

  /**
   * Mock generator for offline
   */
  static generateMock(bbox: BoundingBox, count = 15): UnifiedAircraft[] {
    const mocks: UnifiedAircraft[] = [];
    const airlines = ['AFL', 'S7', 'UAL', 'DAL', 'THY', 'UAE', 'BAW', 'AFR', 'KLM', 'RYR'];
    for (let i = 0; i < count; i++) {
      const icao = Math.random().toString(16).substring(2, 8).padStart(6, '0');
      const lat = bbox.lamin + Math.random() * (bbox.lamax - bbox.lamin);
      const lon = bbox.lomin + Math.random() * (bbox.lomax - bbox.lomin);
      const al = airlines[i % airlines.length];
      mocks.push({
        icao24: icao,
        callsign: `${al}${100 + Math.floor(Math.random() * 9000)}`,
        originCountry: 'Mock ADSB',
        timePosition: Math.floor(Date.now() / 1000),
        lastContact: Math.floor(Date.now() / 1000),
        longitude: lon,
        latitude: lat,
        baroAltitude: 1000 + Math.random() * 11000,
        onGround: false,
        velocity: 150 + Math.random() * 150,
        trueTrack: Math.random() * 360,
        verticalRate: (Math.random() - 0.5) * 5,
        geoAltitude: 1200 + Math.random() * 11000,
        squawk: '1200',
        spi: false,
        category: 5,
        source: AircraftSource.ADSB_LOL,
        lastUpdate: Date.now(),
        isSim: false,
        registration: `RA-${Math.floor(10000 + Math.random() * 89999)}`,
        model: ['B738', 'A320', 'B77W', 'A359', 'B789'][Math.floor(Math.random() * 5)],
      });
    }
    return mocks;
  }

  getLastFetchTime(): number {
    return this.lastFetch;
  }
}

export const adsbService = new AdsbService();
export default AdsbService;
