/**
 * FlightSim - Aircraft Database Models
 * Module: Database / Aircraft
 * Author: Subagent #10 - База Самолетов
 * 
 * Полная типизация для 4 основных типов: B738, A320, B77W, A388
 */

export enum AircraftCategory {
  NARROW_BODY = 'NARROW_BODY',
  WIDE_BODY = 'WIDE_BODY',
  REGIONAL = 'REGIONAL',
  SUPER_HEAVY = 'SUPER_HEAVY',
}

export enum EngineType {
  TURBOFAN = 'TURBOFAN',
  TURBOPROP = 'TURBOPROP',
  TURBOJET = 'TURBOJET',
}

export enum WingtipDevice {
  WINGLET = 'WINGLET',
  SHARKLET = 'SHARKLET',
  SPLIT_SCIMITAR = 'SPLIT_SCIMITAR',
  RAKED_WINGTIP = 'RAKED_WINGTIP',
  NONE = 'NONE',
}

export enum AircraftStatus {
  ACTIVE = 'ACTIVE',
  RETIRED = 'RETIRED',
  PROTOTYPE = 'PROTOTYPE',
  IN_DEVELOPMENT = 'IN_DEVELOPMENT',
}

export interface AircraftDimensions {
  /** Длина фюзеляжа в метрах */
  length_m: number;
  /** Размах крыла в метрах */
  wingspan_m: number;
  /** Высота в метрах */
  height_m: number;
  /** Площадь крыла в м² */
  wingArea_m2: number;
  /** Колея шасси в метрах */
  wheelbase_m: number;
}

export interface AircraftWeights {
  /** Максимальная взлетная масса (кг) */
  mtow_kg: number;
  /** Максимальная посадочная масса (кг) */
  mlw_kg: number;
  /** Максимальная масса без топлива (кг) */
  mzfw_kg: number;
  /** Масса пустого снаряженного (Operating Empty Weight) кг */
  oew_kg: number;
  /** Максимальный запас топлива кг */
  maxFuel_kg: number;
  /** Максимальная полезная нагрузка кг */
  maxPayload_kg: number;
}

export interface AircraftEngine {
  model: string;
  manufacturer: string;
  type: EngineType;
  /** Тяга одного двигателя в кН */
  thrust_kN: number;
  /** Тяга в фунтах */
  thrust_lbf: number;
  /** Bypass ratio */
  bypassRatio: number;
  count: number;
}

export interface AircraftPerformance {
  /** Максимальная дальность в км */
  maxRange_km: number;
  /** Максимальная дальность в морских милях */
  maxRange_nm: number;
  /** Практический потолок в футах */
  ceiling_ft: number;
  /** Практический потолок в метрах */
  ceiling_m: number;
  /** Крейсерская скорость Мах */
  cruiseMach: number;
  /** Крейсерская скорость узлов */
  cruiseSpeed_kts: number;
  /** Крейсерская скорость км/ч */
  cruiseSpeed_kmh: number;
  /** Максимальная скорость Мах */
  maxMach: number;
  /** Скороподъемность фут/мин */
  climbRate_fpm: number;
  /** Потребная дистанция взлета при MTOW в метрах */
  takeoffDistance_m: number;
  /** Потребная дистанция посадки при MLW в метрах */
  landingDistance_m: number;
  /** Часовой расход топлива в крейсере кг/ч (средний) */
  fuelBurn_kgph: number;
  /** Максимальная скорость тангажа */
  maxFuelFlow_kgph?: number;
}

export interface AircraftSpeeds {
  /** Vmo в узлах */
  vmo_kts: number;
  /** Mmo */
  mmo: number;
  /** Vs0 (сваливание с выпущенными закрылками) в узлах */
  vs0_kts: number;
  /** Vs1 (сваливание в чистой конфигурации) */
  vs1_kts: number;
  /** Vne */
  vne_kts: number;
  /** Vr типичная */
  vr_kts: number;
  /** Vapp типичная */
  vapp_kts: number;
}

export interface AircraftCapacity {
  /** Максимальная сертифицированная вместимость */
  maxPax: number;
  /** Типичная двухклассная */
  typicalTwoClass: number;
  /** Типичная трехклассная */
  typicalThreeClass: number;
  /** Экипаж кабины */
  cockpitCrew: number;
  /** Макс. груз в м³ */
  cargoCapacity_m3?: number;
  /** Груз в кг */
  cargoCapacity_kg?: number;
}

/** Основной интерфейс самолета */
export interface Aircraft {
  id: string;
  /** ICAO код типа, например B738 */
  icaoCode: AircraftIcaoType;
  /** IATA код, например 738 */
  iataCode: string;
  /** Полное обозначение модели: Boeing 737-800 */
  model: string;
  /** Короткое имя типа */
  type: string;
  /** Производитель */
  manufacturer: 'Boeing' | 'Airbus';
  /** Семейство */
  family: string;
  /** Маркетинговое название */
  name: string;
  /** Категория */
  category: AircraftCategory;
  /** Статус */
  status: AircraftStatus;
  /** Год первого полета */
  firstFlightYear: number;
  /** Описание */
  description: string;

  dimensions: AircraftDimensions;
  weights: AircraftWeights;
  engines: AircraftEngine[];
  performance: AircraftPerformance;
  speeds: AircraftSpeeds;
  capacity: AircraftCapacity;

  /** Тип законцовки крыла */
  wingtipDevice: WingtipDevice;
  /** Коды доступных ливрей */
  availableLiveryIds: string[];
  /** Особенности */
  features: string[];
  /** Теги для поиска */
  tags: string[];

  /** 3D модель (путь к файлу в проекте) */
  model3dPath?: string;
  /** Изображение превью */
  thumbnailPath?: string;
  /** Сложность управления 1-10 */
  difficultyLevel: number;
  /** Популярность 1-100 */
  popularityScore: number;
  /** Рекомендуется для новичков? */
  beginnerFriendly: boolean;
}

/** Поддерживаемые ICAO типы в базе */
export type AircraftIcaoType = 'B738' | 'A320' | 'B77W' | 'A388';

/** Ливрея */
export interface Livery {
  id: string;
  aircraftId: string;
  compatibleIcaoTypes: AircraftIcaoType[];
  airlineName: string;
  airlineIata: string;
  airlineIcao: string;
  name: string;
  description?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  texturePath: string;
  thumbnailPath: string;
  yearIntroduced: number;
  popularityScore: number;
  isDefault: boolean;
  isFictional: boolean;
  exampleRegistrations: string[];
  country: string;
  type: LiveryType;
}

export enum LiveryType {
  STANDARD = 'STANDARD',
  RETRO = 'RETRO',
  SPECIAL = 'SPECIAL',
  ALLIANCE = 'ALLIANCE',
  CARGO = 'CARGO',
  DEFAULT = 'DEFAULT',
}

export interface AircraftWithLiveries extends Aircraft {
  liveries: Livery[];
}

export interface AircraftFilterOptions {
  icaoType?: AircraftIcaoType | AircraftIcaoType[];
  category?: AircraftCategory;
  manufacturer?: 'Boeing' | 'Airbus';
  beginnerFriendly?: boolean;
  maxMTOW?: number;
  minRange?: number;
  tags?: string[];
  searchQuery?: string;
  difficultyMax?: number;
}

export interface AircraftSortOptions {
  field: 'name' | 'mtow' | 'range' | 'popularity' | 'firstFlightYear' | 'difficulty';
  direction: 'asc' | 'desc';
}
