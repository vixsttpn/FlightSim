/**
 * FlightSim - Database Module
 * Главный экспорт модуля База Самолетов №10
 *
 * Экспортирует:
 * - модели (Aircraft, Livery, enums)
 * - репозиторий (aircraftRepository)
 * - данные (aircrafts.json, liveries.json)
 *
 * Использование:
 * import { aircraftRepository, Aircraft, Livery } from '@/modules/database';
 * const all = aircraftRepository.getAllAircrafts();
 */

export * from './models';
export * from './repository';
export * from './data';

// Singleton instance для удобства
export { aircraftRepository } from './repository/aircraft_repository';

// Реэкспорт типов для удобного импорта
export type {
  Aircraft,
  Livery,
  AircraftIcaoType,
  AircraftFilterOptions,
  AircraftSortOptions,
  AircraftWithLiveries,
  AircraftDimensions,
  AircraftWeights,
  AircraftPerformance
} from './models/aircraft_model';

export {
  AircraftCategory,
  AircraftStatus,
  WingtipDevice,
  EngineType,
  LiveryType
} from './models/aircraft_model';
