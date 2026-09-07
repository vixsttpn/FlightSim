/**
 * Tile Cache Service - IndexedDB based tile caching for offline maps
 * Stores raster tiles as Blob with LRU and expiration
 */

import { TileCacheEntry } from '../types/radar.types';

const DB_NAME = 'FlightSimTiles';
const STORE_NAME = 'tiles';
const DB_VERSION = 2;

const DEFAULT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DEFAULT_MAX_COUNT = 5000;
const DEFAULT_MAX_SIZE_BYTES = 250 * 1024 * 1024; // 250 MB

export interface TileCacheStats {
  count: number;
  totalSize: number;
  oldest: number | null;
  newest: number | null;
  quotaEstimate?: { usage: number; quota: number };
}

type TileCoord = { z: number; x: number; y: number };

class TileCacheService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private maxAgeMs: number;
  private maxCount: number;
  private maxSizeBytes: number;

  constructor(opts?: { maxAgeMs?: number; maxCount?: number; maxSizeBytes?: number }) {
    this.maxAgeMs = opts?.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
    this.maxCount = opts?.maxCount ?? DEFAULT_MAX_COUNT;
    this.maxSizeBytes = opts?.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;
  }

  private openDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('url', 'url', { unique: false });
          store.createIndex('z', 'z', { unique: false });
        } else {
          const store = req.transaction!.objectStore(STORE_NAME);
          // ensure indexes exist on upgrade
          if (!store.indexNames.contains('timestamp')) {
            store.createIndex('timestamp', 'timestamp', { unique: false });
          }
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return this.dbPromise;
  }

  /**
   * Generate canonical key from z/x/y or url
   */
  static makeKey(z: number, x: number, y: number, url?: string): string {
    if (url) return `${z}/${x}/${y}|${url}`;
    return `${z}/${x}/${y}`;
  }

  /**
   * Extract z/x/y from slippy URL (best effort)
   */
  static parseUrl(url: string): TileCoord | null {
    // matches /{z}/{x}/{y}.png or ?z=&x=&y= etc
    const slippy = url.match(/\/(\d+)\/(\d+)\/(\d+)(?:\.png|\.jpg|\.webp|$)/);
    if (slippy) {
      return { z: parseInt(slippy[1]), x: parseInt(slippy[2]), y: parseInt(slippy[3]) };
    }
    // Try query pattern
    try {
      const u = new URL(url);
      const z = u.searchParams.get('z');
      const x = u.searchParams.get('x');
      const y = u.searchParams.get('y');
      if (z && x && y) return { z: +z, x: +x, y: +y };
    } catch {
      // ignore
    }
    return null;
  }

  async getTile(key: string): Promise<Blob | null> {
    try {
      const db = await this.openDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => {
          const entry = req.result as TileCacheEntry | undefined;
          if (!entry) return resolve(null);
          // check expired
          if (Date.now() - entry.timestamp > this.maxAgeMs) {
            // async delete expired but still return maybe? Return null to force refetch
            this.deleteTile(key).catch(() => {});
            return resolve(null);
          }
          // update hits async
          this.bumpHit(entry).catch(() => {});
          resolve(entry.blob);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('[TileCache] getTile error', e);
      return null;
    }
  }

  async setTile(params: {
    key?: string;
    z: number;
    x: number;
    y: number;
    url: string;
    blob: Blob;
  }): Promise<void> {
    try {
      const key = params.key ?? TileCacheService.makeKey(params.z, params.x, params.y, params.url);
      const entry: TileCacheEntry = {
        key,
        z: params.z,
        x: params.x,
        y: params.y,
        url: params.url,
        blob: params.blob,
        timestamp: Date.now(),
        size: params.blob.size,
        hits: 1,
      };

      const db = await this.openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const req = tx.objectStore(STORE_NAME).put(entry);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });

      // opportunistic cleanup (don't await)
      this.ensureLimits().catch(() => {});
    } catch (e) {
      console.warn('[TileCache] setTile error', e);
    }
  }

  private async bumpHit(entry: TileCacheEntry): Promise<void> {
    const db = await this.openDb();
    const updated = { ...entry, hits: entry.hits + 1 };
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).put(updated);
      req.onsuccess = () => res();
      req.onerror = () => rej(req.error);
    });
  }

  async deleteTile(key: string): Promise<void> {
    const db = await this.openDb();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).delete(key);
      req.onsuccess = () => res();
      req.onerror = () => rej(req.error);
    });
  }

  async clear(): Promise<void> {
    const db = await this.openDb();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).clear();
      req.onsuccess = () => res();
      req.onerror = () => rej(req.error);
    });
  }

  async deleteExpired(maxAgeMs = this.maxAgeMs): Promise<number> {
    const db = await this.openDb();
    const cutoff = Date.now() - maxAgeMs;
    let deleted = 0;

    const all = await this.getAllEntries();
    for (const e of all) {
      if (e.timestamp < cutoff) {
        await this.deleteTile(e.key);
        deleted++;
      }
    }
    return deleted;
  }

  private async getAllEntries(): Promise<TileCacheEntry[]> {
    const db = await this.openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
    });
  }

  async getStats(): Promise<TileCacheStats> {
    const entries = await this.getAllEntries();
    let totalSize = 0;
    let oldest: number | null = null;
    let newest: number | null = null;

    for (const e of entries) {
      totalSize += e.size;
      if (oldest === null || e.timestamp < oldest) oldest = e.timestamp;
      if (newest === null || e.timestamp > newest) newest = e.timestamp;
    }

    let quotaEstimate: any = undefined;
    if (navigator.storage && 'estimate' in navigator.storage) {
      try {
        const est = await navigator.storage.estimate();
        quotaEstimate = { usage: est.usage ?? 0, quota: est.quota ?? 0 };
      } catch {}
    }

    return {
      count: entries.length,
      totalSize,
      oldest,
      newest,
      quotaEstimate,
    };
  }

  /**
   * Enforce max count and size via LRU eviction (least hits + oldest first)
   */
  private async ensureLimits(): Promise<void> {
    const entries = await this.getAllEntries();
    if (entries.length <= this.maxCount) {
      const totalSize = entries.reduce((s, e) => s + e.size, 0);
      if (totalSize <= this.maxSizeBytes) return;
    }

    // sort by hits asc, timestamp asc -> least valuable first
    const sorted = [...entries].sort((a, b) => {
      if (a.hits !== b.hits) return a.hits - b.hits;
      return a.timestamp - b.timestamp;
    });

    let count = entries.length;
    let size = entries.reduce((s, e) => s + e.size, 0);
    let i = 0;

    while ((count > this.maxCount || size > this.maxSizeBytes) && i < sorted.length) {
      const victim = sorted[i++];
      await this.deleteTile(victim.key);
      count--;
      size -= victim.size;
    }
  }

  /**
   * Fetch wrapper with cache-first strategy
   */
  async fetchTile(url: string, fallbackToNetwork = true): Promise<Blob | null> {
    const coord = TileCacheService.parseUrl(url);
    const key = coord ? TileCacheService.makeKey(coord.z, coord.x, coord.y, url) : url;

    // 1) cache
    const cached = await this.getTile(key);
    if (cached) return cached;

    if (!fallbackToNetwork) return null;

    // 2) network
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const blob = await res.blob();

      // save async
      if (coord) {
        this.setTile({ key, z: coord.z, x: coord.x, y: coord.y, url, blob }).catch(() => {});
      } else {
        // attempt to parse anyway
        this.setTile({ key: url, z: 0, x: 0, y: 0, url, blob }).catch(() => {});
      }

      return blob;
    } catch (e) {
      console.warn('[TileCache] fetchTile network error', e);
      return null;
    }
  }

  /**
   * Prefetch bbox tiles for given zoom levels
   */
  async prefetchBbox(
    bbox: { lamin: number; lomin: number; lamax: number; lomax: number },
    zooms: number[],
    urlTemplate: string,
    onProgress?: (done: number, total: number) => void
  ): Promise<number> {
    const tiles: { z: number; x: number; y: number }[] = [];
    for (const z of zooms) {
      tiles.push(...this.bboxToTiles(bbox, z));
    }

    let done = 0;
    let success = 0;
    for (const t of tiles) {
      const url = urlTemplate.replace('{z}', String(t.z)).replace('{x}', String(t.x)).replace('{y}', String(t.y));
      const blob = await this.fetchTile(url, true);
      if (blob) success++;
      done++;
      onProgress?.(done, tiles.length);
      // small throttle to avoid hammering
      await new Promise((r) => setTimeout(r, 50));
    }
    return success;
  }

  private bboxToTiles(
    bbox: { lamin: number; lomin: number; lamax: number; lomax: number },
    zoom: number
  ): TileCoord[] {
    const tiles: TileCoord[] = [];
    const min = this.latLngToTile(bbox.lamin, bbox.lomin, zoom);
    const max = this.latLngToTile(bbox.lamax, bbox.lomax, zoom);
    const xMin = Math.min(min.x, max.x);
    const xMax = Math.max(min.x, max.x);
    const yMin = Math.min(min.y, max.y);
    const yMax = Math.max(min.y, max.y);

    // safety limit: don't generate more than 300 tiles per zoom
    if ((xMax - xMin) * (yMax - yMin) > 300) return [];

    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        tiles.push({ z: zoom, x, y });
      }
    }
    return tiles;
  }

  private latLngToTile(lat: number, lon: number, z: number): TileCoord {
    const x = Math.floor(((lon + 180) / 360) * Math.pow(2, z));
    const y = Math.floor(
      ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
        Math.pow(2, z))
    );
    return { z, x, y };
  }
}

export const tileCacheService = new TileCacheService();
export default TileCacheService;
