/**
 * useLiveFeed hook
 * React wrapper over liveFeedService
 * - manages subscription
 * - bbox control
 * - loading/error states
 * - stats
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { liveFeedService, MOSCOW_BBOX, WORLD_BBOX } from '../services/live-feed.service';
import { BoundingBox, UnifiedAircraft, RadarSnapshot, LiveFeedOptions, MapStyleId } from '../types/radar.types';
import { mapStyleService } from '../services/map-style.service';

export interface UseLiveFeedReturn {
  aircraft: UnifiedAircraft[];
  loading: boolean;
  error: string | null;
  lastUpdate: number | null;
  bbox: BoundingBox;
  setBbox: (bbox: BoundingBox) => void;
  setBboxMoscow: () => void;
  setBboxWorld: () => void;
  isLive: boolean;
  start: () => void;
  stop: () => void;
  stats: { opensky: number; adsb: number; sim: number; total: number } | null;
  selected: UnifiedAircraft | null;
  selectAircraft: (icao24: string | null) => void;
  filtered: UnifiedAircraft[];
  filterCallsign: string;
  setFilterCallsign: (s: string) => void;
  filterSource: string | null;
  setFilterSource: (src: string | null) => void;
  mapStyle: MapStyleId;
  setMapStyle: (id: MapStyleId) => void;
  refresh: () => Promise<void>;
}

export function useLiveFeed(options?: LiveFeedOptions): UseLiveFeedReturn {
  const [aircraft, setAircraft] = useState<UnifiedAircraft[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [bbox, setBboxState] = useState<BoundingBox>(options?.bbox ?? MOSCOW_BBOX);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [stats, setStats] = useState<{ opensky: number; adsb: number; sim: number; total: number } | null>(null);
  const [selected, setSelected] = useState<UnifiedAircraft | null>(null);
  const [filterCallsign, setFilterCallsign] = useState<string>('');
  const [filterSource, setFilterSource] = useState<string | null>(null);
  const [mapStyle, setMapStyleState] = useState<MapStyleId>(mapStyleService.getCurrentStyleId());

  const mountedRef = useRef(true);

  // init service options once
  useEffect(() => {
    if (options) {
      liveFeedService.updateOptions(options);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // subscribe to feed
    const unsub = liveFeedService.subscribe((snapshot: RadarSnapshot) => {
      if (!mountedRef.current) return;
      setAircraft(snapshot.aircraft);
      setLastUpdate(snapshot.timestamp);
      setStats(snapshot.sourceStats);
      setLoading(false);
      setError(null);
      // update selected if still exists
      setSelected((prev) => {
        if (!prev) return null;
        const updated = snapshot.aircraft.find((a) => a.icao24 === prev.icao24);
        return updated ?? null;
      });
    });

    const unsubError = liveFeedService.onError((err: Error) => {
      if (!mountedRef.current) return;
      setError(err.message);
      setLoading(false);
    });

    // track live status
    setIsLive(liveFeedService.isLive());

    // map style listener
    const unsubStyle = mapStyleService.onStyleChange((style) => {
      setMapStyleState(style.id);
    });

    // auto-start
    if (!liveFeedService.isLive()) {
      liveFeedService.start();
      setIsLive(true);
    } else {
      const snap = liveFeedService.getSnapshot();
      if (snap) {
        setAircraft(snap.aircraft);
        setLastUpdate(snap.timestamp);
        setStats(snap.sourceStats);
        setLoading(false);
      }
    }

    return () => {
      mountedRef.current = false;
      unsub();
      unsubError();
      unsubStyle();
    };
  }, []);

  const setBbox = useCallback((newBbox: BoundingBox) => {
    setBboxState(newBbox);
    liveFeedService.setBbox(newBbox);
    setLoading(true);
  }, []);

  const setBboxMoscow = useCallback(() => {
    setBbox(MOSCOW_BBOX);
  }, [setBbox]);

  const setBboxWorld = useCallback(() => {
    setBbox(WORLD_BBOX);
  }, [setBbox]);

  const start = useCallback(() => {
    liveFeedService.start();
    setIsLive(true);
    setLoading(true);
  }, []);

  const stop = useCallback(() => {
    liveFeedService.stop();
    setIsLive(false);
  }, []);

  const selectAircraft = useCallback((icao24: string | null) => {
    if (!icao24) {
      setSelected(null);
      return;
    }
    const found = aircraft.find((a) => a.icao24 === icao24.toLowerCase());
    setSelected(found ?? null);
  }, [aircraft]);

  const setMapStyle = useCallback((id: MapStyleId) => {
    mapStyleService.setStyle(id);
    setMapStyleState(id);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await liveFeedService.fetchNow();
      setError(null);
    } catch (e: any) {
      setError(e.message ?? 'fetch failed');
    } finally {
      setLoading(false);
    }
  }, []);

  // derived filtered list
  const filtered = aircraft.filter((ac) => {
    if (filterCallsign) {
      const needle = filterCallsign.toUpperCase();
      const cs = ac.callsign?.toUpperCase() ?? '';
      const icao = ac.icao24.toUpperCase();
      if (!cs.includes(needle) && !icao.includes(needle)) return false;
    }
    if (filterSource) {
      if (ac.source !== filterSource) return false;
    }
    return true;
  });

  return {
    aircraft,
    loading,
    error,
    lastUpdate,
    bbox,
    setBbox,
    setBboxMoscow,
    setBboxWorld,
    isLive,
    start,
    stop,
    stats,
    selected,
    selectAircraft,
    filtered,
    filterCallsign,
    setFilterCallsign,
    filterSource,
    setFilterSource,
    mapStyle,
    setMapStyle,
    refresh,
  };
}

export default useLiveFeed;
