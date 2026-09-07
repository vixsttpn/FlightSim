/**
 * FlightSim - Aircraft Repository
 * Module: Database / Repository
 * Author: Subagent #10 - База Самолетов
 *
 * Высокоуровневый доступ к базе самолетов и ливрей.
 * Поддерживает кэширование, фильтрацию, поиск и сортировку.
 * Все данные берутся из JSON файлов (20 самолетов B738/A320/B77W/A388 + 41 ливрея)
 */

import { Aircraft, Livery, AircraftIcaoType, AircraftFilterOptions, AircraftSortOptions, AircraftCategory, AircraftWithLiveries } from '../models/aircraft_model';

// Импорт JSON данных (Vite + TS поддерживает json import). Для совместимости делаем dynamic require fallback.
import aircraftsData from '../data/aircrafts.json';
import liveriesData from '../data/liveries.json';

const AIRCRAFTS: Aircraft[] = aircraftsData as Aircraft[];
const LIVERIES: Livery[] = liveriesData as Livery[];

/**
 * Основной репозиторий самолетов
 */
export class AircraftRepository {
  private static instance: AircraftRepository;
  private aircrafts: Aircraft[];
  private liveries: Livery[];
  private aircraftMap: Map<string, Aircraft>;
  private liveryMap: Map<string, Livery>;
  private liveriesByAircraftId: Map<string, Livery[]>;
  private liveriesByIcao: Map<AircraftIcaoType, Livery[]>;

  private constructor() {
    this.aircrafts = AIRCRAFTS;
    this.liveries = LIVERIES;
    this.aircraftMap = new Map(this.aircrafts.map(a => [a.id, a]));
    this.liveryMap = new Map(this.liveries.map(l => [l.id, l]));
    
    this.liveriesByAircraftId = new Map<string, Livery[]>();
    this.liveriesByIcao = new Map<AircraftIcaoType, Livery[]>();

    // Индексация ливрей по aircraftId
    for (const livery of this.liveries) {
      if (!this.liveriesByAircraftId.has(livery.aircraftId)) {
        this.liveriesByAircraftId.set(livery.aircraftId, []);
      }
      this.liveriesByAircraftId.get(livery.aircraftId)!.push(livery);

      for (const icao of livery.compatibleIcaoTypes) {
        if (!this.liveriesByIcao.has(icao)) {
          this.liveriesByIcao.set(icao, []);
        }
        this.liveriesByIcao.get(icao)!.push(livery);
      }
    }
  }

  public static getInstance(): AircraftRepository {
    if (!AircraftRepository.instance) {
      AircraftRepository.instance = new AircraftRepository();
    }
    return AircraftRepository.instance;
  }

  /** Получить все самолеты */
  getAllAircrafts(): Aircraft[] {
    return [...this.aircrafts];
  }

  /** Получить самолет по ID */
  getAircraftById(id: string): Aircraft | undefined {
    return this.aircraftMap.get(id);
  }

  /** Получить самолеты по ICAO коду типа */
  getAircraftsByIcao(icao: AircraftIcaoType): Aircraft[] {
    return this.aircrafts.filter(a => a.icaoCode === icao);
  }

  /** Получить самолеты по IATA */
  getAircraftsByIata(iata: string): Aircraft[] {
    return this.aircrafts.filter(a => a.iataCode === iata);
  }

  /** Получить по производителю */
  getByManufacturer(manufacturer: 'Boeing' | 'Airbus'): Aircraft[] {
    return this.aircrafts.filter(a => a.manufacturer === manufacturer);
  }

  /** Получить по категории */
  getByCategory(category: AircraftCategory): Aircraft[] {
    return this.aircrafts.filter(a => a.category === category);
  }

  /** Получить самолеты для новичков */
  getBeginnerFriendly(): Aircraft[] {
    return this.aircrafts.filter(a => a.beginnerFriendly).sort((a, b) => a.difficultyLevel - b.difficultyLevel);
  }

  /** Получить популярные (sorted by popularityScore desc) */
  getPopular(limit: number = 10): Aircraft[] {
    return [...this.aircrafts].sort((a, b) => b.popularityScore - a.popularityScore).slice(0, limit);
  }

  /** Поиск по строке (имя, модель, теги) */
  search(query: string): Aircraft[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.getAllAircrafts();
    return this.aircrafts.filter(a => 
      a.name.toLowerCase().includes(q) ||
      a.model.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q) ||
      a.icaoCode.toLowerCase().includes(q) ||
      a.tags.some(t => t.toLowerCase().includes(q)) ||
      a.description.toLowerCase().includes(q)
    );
  }

  /** Расширенная фильтрация */
  filter(options: AircraftFilterOptions): Aircraft[] {
    let result = [...this.aircrafts];

    if (options.icaoType) {
      const types = Array.isArray(options.icaoType) ? options.icaoType : [options.icaoType];
      result = result.filter(a => types.includes(a.icaoCode));
    }
    if (options.category) {
      result = result.filter(a => a.category === options.category);
    }
    if (options.manufacturer) {
      result = result.filter(a => a.manufacturer === options.manufacturer);
    }
    if (options.beginnerFriendly !== undefined) {
      result = result.filter(a => a.beginnerFriendly === options.beginnerFriendly);
    }
    if (options.maxMTOW !== undefined) {
      result = result.filter(a => a.weights.mtow_kg <= options.maxMTOW!);
    }
    if (options.minRange !== undefined) {
      result = result.filter(a => a.performance.maxRange_km >= options.minRange!);
    }
    if (options.tags && options.tags.length > 0) {
      result = result.filter(a => options.tags!.every(tag => a.tags.includes(tag)));
    }
    if (options.searchQuery) {
      const q = options.searchQuery.toLowerCase();
      result = result.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.model.toLowerCase().includes(q) ||
        a.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    if (options.difficultyMax !== undefined) {
      result = result.filter(a => a.difficultyLevel <= options.difficultyMax!);
    }

    return result;
  }

  /** Сортировка */
  sort(aircrafts: Aircraft[], options: AircraftSortOptions): Aircraft[] {
    const sorted = [...aircrafts];
    const { field, direction } = options;
    const multiplier = direction === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
      switch (field) {
        case 'name':
          return multiplier * a.name.localeCompare(b.name);
        case 'mtow':
          return multiplier * (a.weights.mtow_kg - b.weights.mtow_kg);
        case 'range':
          return multiplier * (a.performance.maxRange_km - b.performance.maxRange_km);
        case 'popularity':
          return multiplier * (a.popularityScore - b.popularityScore);
        case 'firstFlightYear':
          return multiplier * (a.firstFlightYear - b.firstFlightYear);
        case 'difficulty':
          return multiplier * (a.difficultyLevel - b.difficultyLevel);
        default:
          return 0;
      }
    });
    return sorted;
  }

  /** Получить все ливреи */
  getAllLiveries(): Livery[] {
    return [...this.liveries];
  }

  /** Ливрея по ID */
  getLiveryById(id: string): Livery | undefined {
    return this.liveryMap.get(id);
  }

  /** Ливреи для конкретного самолета по aircraftId */
  getLiveriesForAircraft(aircraftId: string): Livery[] {
    // Прямые по aircraftId + все совместимые по ICAO типу самолета
    const aircraft = this.getAircraftById(aircraftId);
    if (!aircraft) return this.liveriesByAircraftId.get(aircraftId) || [];

    const direct = this.liveriesByAircraftId.get(aircraftId) || [];
    const byIcao = this.liveriesByIcao.get(aircraft.icaoCode) || [];
    
    // Объединяем без дублей по id
    const map = new Map<string, Livery>();
    [...direct, ...byIcao].forEach(l => map.set(l.id, l));
    return Array.from(map.values()).sort((a, b) => b.popularityScore - a.popularityScore);
  }

  /** Ливреи по ICAO типу */
  getLiveriesByIcaoType(icao: AircraftIcaoType): Livery[] {
    return this.liveriesByIcao.get(icao) || [];
  }

  /** Получить самолет вместе с ливреями */
  getAircraftWithLiveries(id: string): AircraftWithLiveries | undefined {
    const aircraft = this.getAircraftById(id);
    if (!aircraft) return undefined;
    const liveries = this.getLiveriesForAircraft(id);
    return { ...aircraft, liveries };
  }

  /** Получить все самолеты с ливреями */
  getAllAircraftsWithLiveries(): AircraftWithLiveries[] {
    return this.aircrafts.map(a => ({
      ...a,
      liveries: this.getLiveriesForAircraft(a.id)
    }));
  }

  /** Статистика по базе */
  getStats() {
    const byIcao: Record<string, number> = {};
    const byManufacturer: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const ac of this.aircrafts) {
      byIcao[ac.icaoCode] = (byIcao[ac.icaoCode] || 0) + 1;
      byManufacturer[ac.manufacturer] = (byManufacturer[ac.manufacturer] || 0) + 1;
      byCategory[ac.category] = (byCategory[ac.category] || 0) + 1;
    }

    return {
      totalAircrafts: this.aircrafts.length,
      totalLiveries: this.liveries.length,
      byIcao,
      byManufacturer,
      byCategory,
      averageDifficulty: this.aircrafts.reduce((sum, a) => sum + a.difficultyLevel, 0) / this.aircrafts.length,
      maxRange: Math.max(...this.aircrafts.map(a => a.performance.maxRange_km)),
      maxMTOW: Math.max(...this.aircrafts.map(a => a.weights.mtow_kg)),
    };
  }

  /** Получить дефолтную ливрею для самолета */
  getDefaultLiveryForAircraft(aircraftId: string): Livery | undefined {
    const liveries = this.getLiveriesForAircraft(aircraftId);
    return liveries.find(l => l.isDefault) || liveries[0];
  }

  /** Проверка совместимости ливреи с самолетом */
  isLiveryCompatibleWithAircraft(liveryId: string, aircraftId: string): boolean {
    const aircraft = this.getAircraftById(aircraftId);
    const livery = this.getLiveryById(liveryId);
    if (!aircraft || !livery) return false;
    return livery.compatibleIcaoTypes.includes(aircraft.icaoCode);
  }

  /** Получить самолеты готовые к полету (с дефолтной ливреей) */
  getFlyableAircrafts(): AircraftWithLiveries[] {
    return this.getAllAircraftsWithLiveries().filter(acw => acw.liveries.length > 0);
  }
}

/** Singleton instance для удобного импорта */
export const aircraftRepository = AircraftRepository.getInstance();

/**
 * Хелперы для быстрого доступа (функциональный API)
 */
export const getAircraftById = (id: string) => aircraftRepository.getAircraftById(id);
export const getAllAircrafts = () => aircraftRepository.getAllAircrafts();
export const getAircraftsByIcao = (icao: AircraftIcaoType) => aircraftRepository.getAircraftsByIcao(icao);
export const searchAircrafts = (q: string) => aircraftRepository.search(q);
export const filterAircrafts = (opts: AircraftFilterOptions) => aircraftRepository.filter(opts);
export const getLiveriesForAircraft = (aircraftId: string) => aircraftRepository.getLiveriesForAircraft(aircraftId);
export const getPopularLiveries = (limit = 10) => aircraftRepository.getAllLiveries().sort((a, b) => b.popularityScore - a.popularityScore).slice(0, limit);
