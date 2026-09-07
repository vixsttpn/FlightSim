/**
 * OpenSky Network Service
 * Fetches live states from https://opensky-network.org/api/states/all
 * Docs: https://openskylive.github.io/trino-docs/opensky-api/rest.html
 */

import {
  BoundingBox,
  UnifiedAircraft,
  AircraftSource,
  OpenSkyRawState,
  OpenSkyResponse,
} from '../types/radar.types';

const OPENSKY_BASE = 'https://opensky-network.org/api';
const DEFAULT_TIMEOUT = 12_000;
const RATE_LIMIT_MS = 10_000; // anon users 10s, authenticated ~5s

interface OpenSkyServiceConfig {
  username?: string;
  password?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

class OpenSkyService {
  private lastRequestTime = 0;
  private config: Required<OpenSkyServiceConfig>;
  private abortController: AbortController | null = null;

  constructor(cfg: OpenSkyServiceConfig = {}) {
    this.config = {
      username: cfg.username ?? '',
      password: cfg.password ?? '',
      baseUrl: cfg.baseUrl ?? OPENSKY_BASE,
      timeoutMs: cfg.timeoutMs ?? DEFAULT_TIMEOUT,
    };
  }

  /**
   * Build auth header if credentials provided
   */
  private getAuthHeader(): Record<string, string> {
    if (!this.config.username || !this.config.password) return {};
    const token = btoa(`${this.config.username}:${this.config.password}`);
    return { Authorization: `Basic ${token}` };
  }

  /**
   * Rate-limit guard - OpenSky bans aggressively
   */
  private async respectRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < RATE_LIMIT_MS) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Core fetch with timeout + retry
   */
  private async fetchWithTimeout(url: string, opts: RequestInit = {}, retries = 1): Promise<Response> {
    this.abortController?.abort();
    this.abortController = new AbortController();
    const timer = setTimeout(() => this.abortController!.abort(), this.config.timeoutMs);

    try {
      const res = await fetch(url, {
        ...opts,
        signal: this.abortController.signal,
        headers: {
          Accept: 'application/json',
          ...this.getAuthHeader(),
          ...(opts.headers || {}),
        },
      });
      clearTimeout(timer);

      if (res.status === 429) {
        // Too many requests
        if (retries > 0) {
          console.warn('[OpenSky] 429 rate limit, waiting 15s');
          await new Promise((r) => setTimeout(r, 15_000));
          return this.fetchWithTimeout(url, opts, retries - 1);
        }
        throw new Error('OPENSKY_RATE_LIMIT');
      }

      if (!res.ok) {
        throw new Error(`OpenSky HTTP ${res.status} ${res.statusText}`);
      }

      return res;
    } catch (e: any) {
      clearTimeout(timer);
      if (e.name === 'AbortError') throw new Error('OPENSKY_TIMEOUT');
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, 2_000));
        return this.fetchWithTimeout(url, opts, retries - 1);
      }
      throw e;
    }
  }

  /**
   * Convert raw array state (as per API) to typed object
   * API returns array: [icao24, callsign, origin_country, time_position, last_contact, lon, lat, baro_alt, on_ground, velocity, true_track, vertical_rate, sensors, geo_alt, squawk, spi, position_source, category]
   */
  static parseRawArray(arr: any[]): OpenSkyRawState {
    return {
      icao24: (arr[0] as string)?.toLowerCase()?.trim() ?? '',
      callsign: (arr[1] as string)?.trim() || null,
      origin_country: (arr[2] as string) ?? 'Unknown',
      time_position: arr[3] ?? null,
      last_contact: arr[4] ?? 0,
      longitude: arr[5] ?? null,
      latitude: arr[6] ?? null,
      baro_altitude: arr[7] ?? null,
      on_ground: !!arr[8],
      velocity: arr[9] ?? null,
      true_track: arr[10] ?? null,
      vertical_rate: arr[11] ?? null,
      sensors: arr[12] ?? null,
      geo_altitude: arr[13] ?? null,
      squawk: arr[14] ?? null,
      spi: !!arr[15],
      position_source: arr[16] ?? 0,
      category: arr[17] ?? 0,
    };
  }

  static toUnified(raw: OpenSkyRawState): UnifiedAircraft {
    return {
      icao24: raw.icao24.toLowerCase(),
      callsign: raw.callsign?.trim() || null,
      originCountry: raw.origin_country,
      timePosition: raw.time_position,
      lastContact: raw.last_contact,
      longitude: raw.longitude,
      latitude: raw.latitude,
      baroAltitude: raw.baro_altitude,
      onGround: raw.on_ground,
      velocity: raw.velocity,
      trueTrack: raw.true_track,
      verticalRate: raw.vertical_rate,
      geoAltitude: raw.geo_altitude,
      squawk: raw.squawk,
      spi: raw.spi,
      category: raw.category,
      source: AircraftSource.OPENSKY,
      lastUpdate: Date.now(),
      isSim: false,
    };
  }

  /**
   * Fetch states/all with optional bounding box
   * @param bbox - WGS84 bbox
   */
  async fetchStates(bbox?: BoundingBox): Promise<UnifiedAircraft[]> {
    await this.respectRateLimit();

    const params = new URLSearchParams();
    if (bbox) {
      params.set('lamin', bbox.lamin.toString());
      params.set('lomin', bbox.lomin.toString());
      params.set('lamax', bbox.lamax.toString());
      params.set('lomax', bbox.lomax.toString());
    }

    const url = `${this.config.baseUrl}/states/all${params.toString() ? `?${params}` : ''}`;
    // console.debug('[OpenSky] GET', url);

    const res = await this.fetchWithTimeout(url);
    const json: OpenSkyResponse = await res.json();

    if (!json.states || !Array.isArray(json.states)) {
      return [];
    }

    const result: UnifiedAircraft[] = [];
    for (const rawArr of json.states) {
      try {
        const raw = OpenSkyService.parseRawArray(rawArr);
        // Filter invalid positions
        if (raw.latitude === null || raw.longitude === null) continue;
        if (Math.abs(raw.latitude) > 90 || Math.abs(raw.longitude) > 180) continue;
        result.push(OpenSkyService.toUnified(raw));
      } catch (e) {
        // skip corrupt entry
        continue;
      }
    }

    return result;
  }

  /**
   * Fetch single aircraft by ICAO24
   */
  async fetchByIcao24(icao24: string, bbox?: BoundingBox): Promise<UnifiedAircraft | null> {
    const states = await this.fetchStates(bbox);
    return states.find((s) => s.icao24 === icao24.toLowerCase()) ?? null;
  }

  /**
   * Get flights in time window for airport (extra API)
   * Useful for arrivals/departures
   */
  async fetchArrivals(airportIcao: string, begin: number, end: number): Promise<any[]> {
    await this.respectRateLimit();
    const url = `${this.config.baseUrl}/flights/arrival?airport=${airportIcao}&begin=${begin}&end=${end}`;
    const res = await this.fetchWithTimeout(url);
    return res.json();
  }

  async fetchDepartures(airportIcao: string, begin: number, end: number): Promise<any[]> {
    await this.respectRateLimit();
    const url = `${this.config.baseUrl}/flights/departure?airport=${airportIcao}&begin=${begin}&end=${end}`;
    const res = await this.fetchWithTimeout(url);
    return res.json();
  }

  /**
   * Simple health check
   */
  async isAvailable(): Promise<boolean> {
    try {
      const res = await this.fetchWithTimeout(`${this.config.baseUrl}/states/all?lamin=45&lomin=7&lamax=46&lomax=8`, {}, 0);
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Generate mock data for offline dev
   */
  static generateMock(bbox: BoundingBox, count = 20): UnifiedAircraft[] {
    const mocks: UnifiedAircraft[] = [];
    for (let i = 0; i < count; i++) {
      const icao = Math.random().toString(16).substring(2, 8).padStart(6, '0');
      const lat = bbox.lamin + Math.random() * (bbox.lamax - bbox.lamin);
      const lon = bbox.lomin + Math.random() * (bbox.lomax - bbox.lomin);
      mocks.push({
        icao24: icao,
        callsign: `MOCK${100 + i}`,
        originCountry: 'Mockland',
        timePosition: Math.floor(Date.now() / 1000),
        lastContact: Math.floor(Date.now() / 1000),
        longitude: lon,
        latitude: lat,
        baroAltitude: 3000 + Math.random() * 9000,
        onGround: false,
        velocity: 200 + Math.random() * 100,
        trueTrack: Math.random() * 360,
        verticalRate: (Math.random() - 0.5) * 10,
        geoAltitude: 3200 + Math.random() * 9000,
        squawk: '7000',
        spi: false,
        category: 5,
        source: AircraftSource.OPENSKY,
        lastUpdate: Date.now(),
        isSim: false,
      });
    }
    return mocks;
  }

  dispose() {
    this.abortController?.abort();
  }
}

// Singleton default instance
export const openskyService = new OpenSkyService();
export default OpenSkyService;
