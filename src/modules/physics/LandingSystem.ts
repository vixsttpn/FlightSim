/**
 * FlightSim - LandingSystem.ts
 * Система посадки: фазы, flare, braking, ILS захват.
 * Формулы: liftFactor=1+ge*0.15, braking s=V^2/(2*mu*g)
 */

import { AircraftState, ControlSurfaces, PhysicsCalculator, SEA_LEVEL } from './PhysicsCalculator';
import { AutopilotSystem } from './AutopilotSystem';

export type LandingPhase = 'CRUISE' | 'APPROACH' | 'FINAL' | 'FLARE' | 'TOUCHDOWN' | 'ROLLOUT' | 'GO_AROUND';

export interface RunwayData {
  lat: number; lon: number; altM: number; headingDeg: number;
  lengthM: number; widthM: number; ilsAvailable: boolean; glideslopeDeg: number;
}

export interface LandingMetrics {
  phase: LandingPhase; radioAltM: number; distanceToThresholdM: number;
  locDevDeg: number; gsDevDeg: number; vsMS: number; iasMS: number;
  crosswindMS: number; touchdownVsMS?: number; touchdownIASMS?: number;
  gForceAtTouchdown?: number; flareInitiatedAltM?: number;
  isHardLanding: boolean; isCenterline: boolean; brakingDistanceM?: number;
}

export interface LandingSystemConfig {
  flareAltM: number; flarePitchIncrementDeg: number;
  touchdownVsLimitMS: number; maxCrosswindMS: number;
  brakeFrictionMu: number; autobrakes: 1|2|3|4|'RTO';
}

export class LandingSystem {
  private phase: LandingPhase = 'CRUISE';
  private runway: RunwayData | null = null;
  private metrics!: LandingMetrics;
  private config: LandingSystemConfig;
  private flareStartAlt: number | null = null;
  private rolloutStartTimeS = 0;
  private approachSpeedMS = 70;

  constructor(cfg?: Partial<LandingSystemConfig>) {
    this.config = {
      flareAltM: 15, flarePitchIncrementDeg: 4, touchdownVsLimitMS: 2.5,
      maxCrosswindMS: 15, brakeFrictionMu: 0.4, autobrakes: 3, ...cfg
    };
    this.metrics = {
      phase: 'CRUISE', radioAltM: 3000, distanceToThresholdM: 10000,
      locDevDeg: 0, gsDevDeg: 0, vsMS: 0, iasMS: 70, crosswindMS: 0,
      isHardLanding: false, isCenterline: true
    };
  }

  setRunway(rwy: RunwayData, appSpdMS?: number) {
    this.runway = rwy;
    if (appSpdMS) this.approachSpeedMS = appSpdMS;
  }

  reset() {
    this.phase = 'CRUISE'; this.flareStartAlt = null; this.rolloutStartTimeS = 0;
  }

  static groundEffectModel(aglM: number, spanM: number) {
    const ge = PhysicsCalculator.groundEffectFactor(aglM, spanM);
    return { liftFactor: 1 + ge * 0.15, dragFactor: 1 - ge * 0.2 };
  }

  computeFlarePitch(radioAltM: number, vsMS: number, basePitchDeg: number): number {
    const { flareAltM, flarePitchIncrementDeg } = this.config;
    if (radioAltM > flareAltM) return basePitchDeg;
    const hRatio = radioAltM / flareAltM;
    const flareProg = Math.pow(1 - hRatio, 1.1);
    return Math.min(basePitchDeg + flarePitchIncrementDeg * flareProg + Math.max(0, -vsMS) * 0.8, basePitchDeg + flarePitchIncrementDeg + 2);
  }

  updateMetrics(state: AircraftState, spanM: number): LandingMetrics {
    let radioAlt = state.pos.altAGL_M ?? state.pos.altM;
    let distanceToRWY = this.metrics.distanceToThresholdM;
    let locDev = 0, gsDev = 0;
    if (this.runway) {
      const ils = AutopilotSystem.computeILSDeviation(
        state.pos.lat, state.pos.lon, state.pos.altM,
        this.runway.lat, this.runway.lon, this.runway.altM, this.runway.headingDeg
      );
      distanceToRWY = ils.distanceM; locDev = ils.locDevDeg; gsDev = ils.gsDevDeg;
      if (distanceToRWY < 4000) radioAlt = Math.max(0, state.pos.altM - this.runway.altM);
    }
    const drift = (state.attitude.yawDeg - state.vel.trackDeg) * Math.PI / 180;
    const crosswind = Math.sin(drift) * state.vel.tasMS;
    this.metrics = {
      ...this.metrics, radioAltM: radioAlt, distanceToThresholdM: distanceToRWY,
      locDevDeg: locDev, gsDevDeg: gsDev, vsMS: state.vel.vsMS,
      iasMS: state.vel.iasMS, crosswindMS: crosswind,
      isCenterline: Math.abs(locDev) < 1.0
    };
    return this.metrics;
  }

  update(state: AircraftState, controls: ControlSurfaces, dt: number, spanM: number) {
    const metrics = this.updateMetrics(state, spanM);
    const radioAlt = metrics.radioAltM;
    const vs = state.vel.vsMS;
    let newControls = { ...controls };
    let nextPhase = this.phase;

    switch (this.phase) {
      case 'CRUISE':
        if (radioAlt < 1500 && this.runway && metrics.distanceToThresholdM < 15000) nextPhase = 'APPROACH';
        break;
      case 'APPROACH':
        newControls.gearDown = true;
        if (radioAlt < 600 && newControls.flapsDeg < 20) newControls.flapsDeg = 20;
        if (radioAlt < 300) nextPhase = 'FINAL';
        break;
      case 'FINAL':
        newControls.gearDown = true;
        if (newControls.flapsDeg < 30) newControls.flapsDeg = 30;
        if (Math.abs(metrics.crosswindMS) > 3) {
          const crabCorr = Math.max(-0.3, Math.min(0.3, metrics.crosswindMS * 0.03));
          newControls.rudder = -crabCorr;
          newControls.aileron = crabCorr * 0.5;
        }
        if (radioAlt <= this.config.flareAltM + 2) {
          nextPhase = 'FLARE';
          this.flareStartAlt = radioAlt;
          this.metrics.flareInitiatedAltM = radioAlt;
        }
        break;
      case 'FLARE':
        const basePitch = state.attitude.pitchDeg;
        const targetPitch = this.computeFlarePitch(radioAlt, vs, 1.5);
        const pitchErr = targetPitch - basePitch;
        newControls.elevator += pitchErr * 0.08;
        newControls.elevator = Math.max(-1, Math.min(1, newControls.elevator));
        newControls.throttle = Math.max(0, newControls.throttle - dt * 0.6);
        if (radioAlt <= 0.5 || state.onGround) {
          nextPhase = 'TOUCHDOWN';
          this.rolloutStartTimeS = state.timeS;
          this.metrics.touchdownVsMS = vs;
          this.metrics.touchdownIASMS = state.vel.iasMS;
          this.metrics.gForceAtTouchdown = state.loadFactor;
          this.metrics.isHardLanding = vs < -this.config.touchdownVsLimitMS || state.loadFactor > 2.2;
        }
        break;
      case 'TOUCHDOWN':
        newControls.speedbrake = 1; newControls.throttle = 0;
        if (state.attitude.pitchDeg > 2) newControls.elevator = Math.max(-1, Math.min(1, newControls.elevator - 0.1));
        newControls.rudder = -metrics.locDevDeg * 0.1;
        nextPhase = 'ROLLOUT';
        break;
      case 'ROLLOUT':
        newControls.speedbrake = 1; newControls.throttle = 0;
        newControls.rudder = -metrics.locDevDeg * 0.15;
        newControls.aileron = 0;
        if (state.vel.gsMS < 5) { nextPhase = 'CRUISE'; newControls.speedbrake = 0; }
        break;
      case 'GO_AROUND':
        newControls.throttle = 1; newControls.gearDown = false;
        newControls.flapsDeg = 15; newControls.speedbrake = 0;
        if (radioAlt > 300) nextPhase = 'CRUISE';
        break;
    }

    if ((nextPhase === 'FINAL' || nextPhase === 'FLARE') && (Math.abs(metrics.locDevDeg) > 2.3 || Math.abs(metrics.gsDevDeg) > 1.2 || Math.abs(metrics.crosswindMS) > this.config.maxCrosswindMS)) {
      if (radioAlt > 10) nextPhase = 'GO_AROUND';
    }

    this.phase = nextPhase;
    this.metrics.phase = nextPhase;
    return { newControls, phase: nextPhase, metrics: this.metrics };
  }

  static brakingDistance(vMS: number, mu: number, massKg: number, dragN: number): number {
    const g = SEA_LEVEL.g0;
    const weight = massKg * g;
    const frictionForce = mu * weight * 0.7;
    const decel = (frictionForce + dragN) / massKg;
    return decel <= 0 ? Infinity : (vMS * vMS) / (2 * decel);
  }

  static isStableApproach(state: AircraftState, metrics: LandingMetrics, vRefMS: number): boolean {
    const vsFpm = metrics.vsMS * 196.85;
    const iasKts = metrics.iasMS * 1.94384;
    const vRefKts = vRefMS * 1.94384;
    return Math.abs(iasKts - (vRefKts + 5)) < 10 && vsFpm < -100 && vsFpm > -1100 && Math.abs(metrics.locDevDeg) < 1 && Math.abs(metrics.gsDevDeg) < 1 && Math.abs(state.attitude.rollDeg) < 7;
  }

  getPhase() { return this.phase; }
  getMetrics() { return this.metrics; }
  setBrakingMu(mu: number) { this.config.brakeFrictionMu = mu; }
}
