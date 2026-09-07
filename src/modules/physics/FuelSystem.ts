/**
 * FlightSim - FuelSystem.ts
 * Система топлива: баки, расход, центр тяжести, балансировка, TSFC модель.
 * Формула расхода: fuelFlow = TSFC * Thrust * (1 + k_alt*alt + k_mach*M)
 * Breguet не используется напрямую, но интеграл сохранения массы учтен.
 */

import { AircraftConfig, SEA_LEVEL } from './PhysicsCalculator';

export interface FuelTank {
  id: string;
  capacityKg: number;
  currentKg: number;
  positionM: { x: number; y: number; z: number }; // от CG datum
  priority: number; // порядок выработки (0 = центральный первый)
  feedEngine: number[]; // какие двигатели питает
  transferPumpKgPerS?: number;
}

export interface FuelSystemConfig {
  tanks: FuelTank[];
  /** CG shift model */
  emptyCG_M: { x: number; y: number; z: number };
  /** Изменение CG на кг топлива */
  cgInfluence: { xPerKg: number; fuelRefPos: { x: number; y: number; z: number } };
  /** Резерв */
  reserveKg: number;
  /** Возможность слива */
  jettisonRateKgPerS?: number;
}

export interface FuelFlowState {
  totalFuelKg: number;
  totalCapacityKg: number;
  flowKgPerS: number; // суммарный
  flowPerEngineKgPerS: number[];
  cgShiftM: { x: number; y: number; z: number };
  cgPercentMAC: number;
  enduranceS: number;
  rangeM: number; // оценка
  isLowFuel: boolean;
  isFuelImbalance: boolean;
  tanks: FuelTank[];
}

export class FuelSystem {
  private config: FuelSystemConfig;
  private tanks: FuelTank[];
  private aircraftConfig: AircraftConfig;
  private jettisonActive = false;
  private crossfeedActive = false;

  constructor(acConfig: AircraftConfig, fuelConfig: FuelSystemConfig) {
    this.aircraftConfig = acConfig;
    this.config = fuelConfig;
    // deep copy
    this.tanks = fuelConfig.tanks.map(t => ({ ...t, positionM: { ...t.positionM }, feedEngine: [...t.feedEngine] }));
    this.normalizeFuel();
  }

  /** Инициализация с распределением топлива пропорционально ёмкости */
  setTotalFuel(kg: number) {
    const cap = this.totalCapacity();
    const target = Math.min(kg, cap);
    const sorted = [...this.tanks].sort((a,b)=> a.priority - b.priority);
    let remaining = target;
    // Сбрасываем
    this.tanks.forEach(t=> t.currentKg = 0);
    // Заполняем по приоритету? Наоборот - сначала крылья, потом центр для баланса
    // Для простоты пропорционально
    if (remaining <=0) return;
    const totalPriorWeight = sorted.reduce((s,t)=> s + 1/(t.priority+1),0);
    for (const tank of sorted) {
      const share = (1/(tank.priority+1))/totalPriorWeight;
      const fill = Math.min(tank.capacityKg, remaining * share * sorted.length / totalPriorWeight * 0.5 + remaining * tank.capacityKg / cap * 0.5);
      // упростим: пропорционально
    }
    // Пропорциональное корректное распределение:
    this.tanks.forEach(t=> t.currentKg = 0);
    remaining = target;
    const totalCap = cap;
    for (const tank of this.tanks) {
      const alloc = (tank.capacityKg / totalCap) * target;
      tank.currentKg = Math.min(tank.capacityKg, alloc);
    }
    // корректировка по разнице из-за округлений
    this.normalizeFuel();
    const currentTotal = this.totalFuel();
    const diff = target - currentTotal;
    if (Math.abs(diff) > 0.01 && this.tanks.length) {
      this.tanks[0].currentKg = Math.min(this.tanks[0].capacityKg, Math.max(0, this.tanks[0].currentKg + diff));
    }
  }

  private totalCapacity(): number {
    return this.tanks.reduce((s,t)=> s+t.capacityKg,0);
  }

  private totalFuel(): number {
    return this.tanks.reduce((s,t)=> s+t.currentKg,0);
  }

  private normalizeFuel() {
    this.tanks.forEach(t=>{
      t.currentKg = Math.max(0, Math.min(t.capacityKg, t.currentKg));
    });
  }

  /** TSFC корректировка по высоте и скорости */
  static correctedTSFC(baseTSFC: number, altM: number, mach: number, tasMS: number): number {
    // С ростом высоты TSFC чуть уменьшается, с ростом M увеличивается
    // TSFC_corr = TSFC0 * (1 - 0.00002*alt) * (1 + 0.2*M^2) * theta^0.5
    // theta = T/T0
    const { T0, L } = SEA_LEVEL;
    const tempK = Math.max(180, T0 - L * altM);
    const theta = tempK / T0;
    const altFactor = Math.max(0.85, 1 - altM * 1.2e-5);
    const machFactor = 1 + 0.15 * mach * mach;
    return baseTSFC * Math.sqrt(theta) * machFactor * altFactor;
  }

  /** Fuel flow = TSFC * Thrust */
  computeFuelFlow(thrustN: number, altM: number, mach: number, tasMS: number, numEngines: number): {total: number, perEngine: number[]} {
    const baseTSFC = this.aircraftConfig.engine.tsfc;
    const tsfcCorr = FuelSystem.correctedTSFC(baseTSFC, altM, mach, tasMS);
    // Idle flow минимум
    const totalFlow = Math.max(thrustN * tsfcCorr, numEngines * 0.05); // минимум 0.05 кг/с на двиг
    const perEngine = Array(numEngines).fill(totalFlow / numEngines);
    return { total: totalFlow, perEngine };
  }

  /** Сжигание топлива за dt */
  burnFuel(dtS: number, thrustN: number, altM: number, mach: number, tasMS: number): FuelFlowState {
    const { total: flowRate, perEngine } = this.computeFuelFlow(thrustN, altM, mach, tasMS, this.aircraftConfig.engine.numEngines);
    const totalBurn = flowRate * dtS;
    let remainingBurn = totalBurn;

    // Логика выработки: сначала центральный бак, затем крыльевые, чтобы уменьшить изгиб.
    // Сортируем по приоритету (меньше priority = сжигается первым)
    const burnOrder = [...this.tanks].sort((a,b)=> a.priority - b.priority);

    for (const tank of burnOrder) {
      if (remainingBurn <=0) break;
      if (tank.currentKg <=0) continue;
      // Если crossfeed выключен, проверяем что бак питает двигатель с тягой (упрощено)
      const burnFromThis = Math.min(tank.currentKg, remainingBurn * (tank.capacityKg / this.totalCapacity() + 0.5));
      // Более просто: пропорционально доступному, но центральный в приоритете
      const share = tank.priority === 0 ? 0.7 : 0.3 / (burnOrder.length-1 ||1);
      const want = remainingBurn * share;
      const actual = Math.min(tank.currentKg, want >0 ? want : remainingBurn / burnOrder.length);
      tank.currentKg -= actual;
      remainingBurn -= actual;
    }
    // Если еще осталось (central empty), дожигаем из любых с топливом
    if (remainingBurn > 0.001) {
      for (const tank of burnOrder) {
        if (remainingBurn <=0) break;
        const take = Math.min(tank.currentKg, remainingBurn);
        tank.currentKg -= take;
        remainingBurn -= take;
      }
    }

    // Jettison
    if (this.jettisonActive && this.config.jettisonRateKgPerS) {
      const jettisonBurn = this.config.jettisonRateKgPerS * dtS;
      for (const tank of this.tanks) {
        if (jettisonBurn <=0) break;
        if (tank.id.includes('center') || tank.id.includes('central')) {
          const dump = Math.min(tank.currentKg, jettisonBurn);
          tank.currentKg -= dump;
        }
      }
    }

    this.normalizeFuel();
    this.balanceFuel(dtS);

    return this.getState(flowRate, perEngine, thrustN, tasMS);
  }

  /** Балансировка крыльевых баков */
  private balanceFuel(dtS: number) {
    const wingTanks = this.tanks.filter(t=> t.id.includes('wing') || t.id.includes('left') || t.id.includes('right'));
    if (wingTanks.length < 2) return;
    // Найдем левый и правый (эвристика)
    const left = wingTanks.find(t=> t.id.toLowerCase().includes('left'));
    const right = wingTanks.find(t=> t.id.toLowerCase().includes('right'));
    if (!left || !right) return;
    const diff = left.currentKg - right.currentKg;
    const imbalanceThreshold = 100; // кг
    if (Math.abs(diff) > imbalanceThreshold && this.crossfeedActive) {
      const transferRate = 2.0; // кг/с
      const transfer = Math.min(Math.abs(diff)/2, transferRate * dtS);
      if (diff > 0) {
        left.currentKg -= transfer;
        right.currentKg += transfer;
      } else {
        right.currentKg -= transfer;
        left.currentKg += transfer;
      }
    }
  }

  getState(flowRate: number, perEngine: number[], thrustN: number, tasMS: number): FuelFlowState {
    const totalFuel = this.totalFuel();
    const totalCap = this.totalCapacity();
    // CG shift: delta CG = (fuel_mass * (fuel_cg - empty_cg)) / total_mass approximation
    // Для простоты усредненная позиция топлива
    let fuelMomentX = 0, fuelMomentY = 0;
    let fuelMass = 0;
    for (const tank of this.tanks) {
      fuelMomentX += tank.currentKg * tank.positionM.x;
      fuelMomentY += tank.currentKg * tank.positionM.y;
      fuelMass += tank.currentKg;
    }
    const avgFuelX = fuelMass >0 ? fuelMomentX / fuelMass : this.config.cgInfluence.fuelRefPos.x;
    const emptyCGX = this.config.emptyCG_M.x;
    // CG shift approx: (fuel * (avgFuel - empty)) / (emptyMass + fuel) influence + base
    const totalMass = this.aircraftConfig.emptyMassKg + fuelMass;
    const cgShiftX = (fuelMass * (avgFuelX - emptyCGX)) / totalMass * this.config.cgInfluence.xPerKg * 1000; // м

    const cgPercentMAC = 25 + cgShiftX * 100; // 25% MAC base + shift, упрощено

    // Endurance: totalFuel / flowRate
    const enduranceS = flowRate >0 ? totalFuel / flowRate : 0;
    const rangeM = tasMS * enduranceS; // max range упрощенно, без ветра

    const isLow = totalFuel < this.config.reserveKg + totalCap*0.05;
    const wingImbalance = (()=> {
      const left = this.tanks.find(t=> t.id.toLowerCase().includes('left'));
      const right = this.tanks.find(t=> t.id.toLowerCase().includes('right'));
      if (!left || !right) return false;
      return Math.abs(left.currentKg - right.currentKg) > 300;
    })();

    return {
      totalFuelKg: totalFuel,
      totalCapacityKg: totalCap,
      flowKgPerS: flowRate,
      flowPerEngineKgPerS: perEngine,
      cgShiftM: { x: cgShiftX, y: fuelMass >0 ? fuelMomentY/totalMass : 0, z: 0 },
      cgPercentMAC: Math.max(10, Math.min(40, cgPercentMAC)),
      enduranceS,
      rangeM,
      isLowFuel: isLow,
      isFuelImbalance: wingImbalance,
      tanks: this.tanks.map(t=>({...t})),
    };
  }

  toggleCrossfeed(active: boolean) { this.crossfeedActive = active; }
  toggleJettison(active: boolean) { this.jettisonActive = active; }

  /** Добавить топливо в полёте (debug / refuel) */
  refuel(kg: number) {
    this.setTotalFuel(this.totalFuel() + kg);
  }

  static createDefaultConfig(capacityKg = 26000): FuelSystemConfig {
    const perWing = capacityKg * 0.3;
    const center = capacityKg * 0.4;
    return {
      tanks: [
        { id: 'left_wing', capacityKg: perWing, currentKg: perWing, positionM: { x: -0.3, y: -5, z: 0 }, priority: 1, feedEngine: [0] },
        { id: 'right_wing', capacityKg: perWing, currentKg: perWing, positionM: { x: -0.3, y: 5, z: 0 }, priority: 1, feedEngine: [1] },
        { id: 'center', capacityKg: center, currentKg: center, positionM: { x: 0, y: 0, z: -0.2 }, priority: 0, feedEngine: [0,1], transferPumpKgPerS: 2 },
      ],
      emptyCG_M: { x: 0, y: 0, z: 0 },
      cgInfluence: { xPerKg: 0.0000015, fuelRefPos: { x: 0.1, y: 0, z: -0.3 } },
      reserveKg: 1500,
      jettisonRateKgPerS: 20,
    };
  }
}
