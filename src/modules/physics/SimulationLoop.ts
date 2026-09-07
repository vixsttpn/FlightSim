/**
 * FlightSim - SimulationLoop.ts
 * Ядро симуляционного цикла: requestAnimationFrame тик 10Hz (fixed timestep 100ms), accumulator, интеграция подсистем.
 */

import { PhysicsCalculator, AircraftState, ControlSurfaces, B738_CONFIG, SEA_LEVEL, GeoPosition } from './PhysicsCalculator';
import { FuelSystem, FuelSystemConfig, FuelFlowState } from './FuelSystem';
import { AutopilotSystem } from './AutopilotSystem';
import { LandingSystem, RunwayData, LandingPhase, LandingMetrics } from './LandingSystem';

export interface SimConfig {
  fixedHz: number; // 10
  maxSubSteps: number;
}

export interface TickContext {
  deltaS: number; // fixed dt
  timeS: number;
  frameId: number;
  state: AircraftState;
  fuel: FuelFlowState;
  landing: { phase: LandingPhase; metrics: LandingMetrics };
  autopilot: { engaged: boolean; modes: any; annunciations: string[] };
}

export type TickCallback = (ctx: TickContext) => void;

export class SimulationLoop {
  private physics: PhysicsCalculator;
  private fuelSystem: FuelSystem;
  private autopilot: AutopilotSystem;
  private landing: LandingSystem;

  private state: AircraftState;
  private controls: ControlSurfaces;

  private running = false;
  private paused = false;
  private rafId: number | null = null;
  private lastTimestamp = 0;
  private accumulatorS = 0;
  private timeS = 0;
  private frameId = 0;

  private fixedDeltaS: number;
  private maxSubSteps: number;

  private tickListeners: TickCallback[] = [];

  constructor(
    initialPos: GeoPosition,
    initialControls?: Partial<ControlSurfaces>,
    fuelCfg?: FuelSystemConfig,
    simCfg?: Partial<SimConfig>
  ) {
    const hz = simCfg?.fixedHz ?? 10; // 10 Hz
    this.fixedDeltaS = 1 / hz;
    this.maxSubSteps = simCfg?.maxSubSteps ?? 4;

    this.physics = new PhysicsCalculator(B738_CONFIG);
    const defaultFuelCfg = FuelSystem.createDefaultConfig();
    this.fuelSystem = new FuelSystem(B738_CONFIG, fuelCfg ?? defaultFuelCfg);
    this.fuelSystem.setTotalFuel(defaultFuelCfg.tanks.reduce((s, t) => s + t.capacityKg, 0) * 0.7);

    this.autopilot = new AutopilotSystem();
    this.landing = new LandingSystem();

    // Initial state
    this.state = this.createInitialState(initialPos);
    this.controls = {
      elevator: 0, aileron: 0, rudder: 0,
      flapsDeg: 5, gearDown: true, speedbrake: 0, throttle: 0.85,
      ...initialControls,
    };
  }

  private createInitialState(pos: GeoPosition): AircraftState {
    const atm = PhysicsCalculator.getAtmosphere(pos.altM);
    const tas = PhysicsCalculator.knotsToMS(250);
    const ias = tas * Math.sqrt(atm.densityRatio);
    return {
      pos: { ...pos, altAGL_M: pos.altAGL_M ?? pos.altM },
      attitude: { pitchDeg: 3, rollDeg: 0, yawDeg: 90 },
      vel: {
        tasMS: tas, iasMS: ias, gsMS: tas,
        vsMS: 0, mach: tas / atm.soundSpeedMS,
        headingDeg: 90, trackDeg: 90
      },
      angVel: { p: 0, q: 0, r: 0 },
      acc: { x: 0, y: 0, z: 0 },
      massKg: B738_CONFIG.emptyMassKg + this.fuelSystem ? 0 : 20000, // placeholder, will update
      fuelKg: 0,
      aoaDeg: 4, sideslipDeg: 0,
      dynamicPressurePa: PhysicsCalculator.dynamicPressure(atm.rho, tas),
      liftN: 0, dragN: 0, thrustN: 0, weightN: B738_CONFIG.emptyMassKg * SEA_LEVEL.g0,
      loadFactor: 1, stall: false, onGround: pos.altM < 2,
      timeS: 0,
    };
  }

  /** Публичные методы управления циклом */
  start() {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this.lastTimestamp = performance.now();
    this.accumulatorS = 0;
    this.loop(this.lastTimestamp);
  }

  stop() {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  pause() { this.paused = true; }
  resume() {
    if (!this.running) this.start();
    else { this.paused = false; this.lastTimestamp = performance.now(); }
  }

  private loop = (timestamp: number) => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.loop);

    if (this.paused) {
      this.lastTimestamp = timestamp;
      return;
    }

    const frameTimeS = Math.min((timestamp - this.lastTimestamp) / 1000, 0.25); // cap 250ms
    this.lastTimestamp = timestamp;
    this.accumulatorS += frameTimeS;

    let subSteps = 0;
    while (this.accumulatorS >= this.fixedDeltaS && subSteps < this.maxSubSteps) {
      this.fixedUpdate(this.fixedDeltaS);
      this.accumulatorS -= this.fixedDeltaS;
      subSteps++;
    }

    // Если накопилось слишком много - сброс для избежания spiral of death
    if (subSteps >= this.maxSubSteps) this.accumulatorS = 0;
  };

  /** Фиксированный шаг физики 10 Hz */
  private fixedUpdate(dt: number) {
    this.timeS += dt;
    this.frameId++;

    // 1. Автопилот -> корректирует controls
    const apOut = this.autopilot.update(this.state, this.controls, dt);
    if (apOut.engaged) {
      this.controls = apOut.controls;
    }

    // 2. Посадочная система
    const landingOut = this.landing.update(this.state, this.controls, dt, B738_CONFIG.wingSpanM);
    // Если посадка активна (APPROACH..ROLLOUT), система может переопределить controls
    if (['APPROACH', 'FINAL', 'FLARE', 'TOUCHDOWN', 'ROLLOUT'].includes(landingOut.phase)) {
      // Смешение: landing приоритет выше, но AP может оставаться
      this.controls = landingOut.newControls;
    }

    // 3. Физика полета
    const prevMass = this.state.massKg || B738_CONFIG.emptyMassKg + this.fuelSystem.getState(0, [], 0, 0).totalFuelKg;
    const newState = this.physics.updateState(
      { ...this.state, massKg: prevMass, timeS: this.timeS },
      this.controls, dt, { x: 0, y: 0, z: 0 }
    );

    // 4. Топливо
    const fuelState = this.fuelSystem.burnFuel(dt, newState.thrustN, newState.pos.altM, newState.vel.mach, newState.vel.tasMS);
    newState.fuelKg = fuelState.totalFuelKg;
    newState.massKg = B738_CONFIG.emptyMassKg + fuelState.totalFuelKg;
    // Масса не может < empty
    if (newState.massKg < B738_CONFIG.emptyMassKg) newState.massKg = B738_CONFIG.emptyMassKg;

    this.state = newState;

    // 5. Оповещение подписчиков
    const ctx: TickContext = {
      deltaS: dt,
      timeS: this.timeS,
      frameId: this.frameId,
      state: this.state,
      fuel: fuelState,
      landing: { phase: landingOut.phase, metrics: landingOut.metrics },
      autopilot: { engaged: apOut.engaged, modes: apOut, annunciations: apOut.annunciations },
    };

    this.tickListeners.forEach(cb => {
      try { cb(ctx); } catch (e) { console.error('[SimLoop] tick listener error', e); }
    });
  }

  // API для модулей
  onTick(cb: TickCallback) { this.tickListeners.push(cb); return () => { this.tickListeners = this.tickListeners.filter(c => c !== cb); }; }

  getState() { return this.state; }
  getControls() { return this.controls; }
  setControls(c: Partial<ControlSurfaces>) { this.controls = { ...this.controls, ...c }; }

  getAutopilot() { return this.autopilot; }
  getFuelSystem() { return this.fuelSystem; }
  getLandingSystem() { return this.landing; }
  getPhysics() { return this.physics; }

  /** Установить ILS runway для AP и landing */
  setRunway(rwy: RunwayData) {
    this.landing.setRunway(rwy);
    // также обновить цели AP для ILS
    this.autopilot.setTargets({
      ils: {
        localizerDevDeg: 0, glideslopeDevDeg: 0,
        runwayHeadingDeg: rwy.headingDeg, distanceM: 5000
      }
    });
  }

  /** Прямой тик для тестов без rAF */
  tickManual(dt?: number) {
    const delta = dt ?? this.fixedDeltaS;
    this.fixedUpdate(delta);
  }
}

/** Singleton для глобального использования (опционально) */
let globalLoop: SimulationLoop | null = null;
export function getGlobalSimulationLoop(initialPos?: GeoPosition): SimulationLoop {
  if (!globalLoop && initialPos) globalLoop = new SimulationLoop(initialPos);
  if (!globalLoop) throw new Error('Global SimulationLoop not initialized, provide initialPos first');
  return globalLoop;
}
