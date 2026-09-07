/**
 * FlightSim - AutopilotSystem.ts
 * Полный автопилот: HDG HOLD, ALT HOLD, SPD HOLD (autothrottle), NAV (LNAV), ILS (GS/LOC).
 * PID контроллеры с anti-windup, ограничением bank/pitch, фильтрами.
 */

import { AircraftState, ControlSurfaces } from './PhysicsCalculator';

export type LateralMode = 'OFF' | 'HDG' | 'NAV' | 'APP' | 'ILS_LOC';
export type VerticalMode = 'OFF' | 'ALT' | 'VS' | 'FLC' | 'GS' | 'ILS_GS';
export type SpeedMode = 'OFF' | 'SPD' | 'THRUST' | 'MACH';

export interface AutopilotTargets {
  headingDeg: number;
  altitudeM: number;
  vsMS: number; // target vertical speed for VS mode
  speedMS: number; // TAS or IAS depending on mode, мы используем IAS MS
  mach?: number;
  navBearingDeg?: number;
  navCrossTrackErrorM?: number;
  ils?: {
    localizerDevDeg: number; // -2.5 .. 2.5
    glideslopeDevDeg: number;
    runwayHeadingDeg: number;
    distanceM: number;
  };
}

export interface AutopilotLimits {
  maxBankDeg: number;
  maxPitchDeg: number;
  maxVsMS: number;
  maxThrottleRate: number;
}

export interface PIDConfig {
  kp: number;
  ki: number;
  kd: number;
  integralLimit: number;
  outputLimit: number;
}

export class PID {
  kp: number; ki: number; kd: number;
  integral = 0;
  prevError = 0;
  integralLimit: number;
  outputLimit: number;
  filterAlpha = 0.1;
  prevDeriv = 0;

  constructor(cfg: PIDConfig) {
    this.kp = cfg.kp; this.ki = cfg.ki; this.kd = cfg.kd;
    this.integralLimit = cfg.integralLimit;
    this.outputLimit = cfg.outputLimit;
  }

  reset() { this.integral = 0; this.prevError = 0; this.prevDeriv = 0; }

  update(error: number, dt: number): number {
    if (dt <= 0) return 0;
    // Integral with anti-windup
    this.integral += error * dt;
    this.integral = Math.max(-this.integralLimit, Math.min(this.integralLimit, this.integral));

    const derivRaw = (error - this.prevError) / dt;
    // Low-pass filter derivative
    const deriv = this.prevDeriv * (1 - this.filterAlpha) + derivRaw * this.filterAlpha;
    this.prevDeriv = deriv;
    this.prevError = error;

    let out = this.kp * error + this.ki * this.integral + this.kd * deriv;
    out = Math.max(-this.outputLimit, Math.min(this.outputLimit, out));
    return out;
  }
}

export interface AutopilotOutput {
  controls: ControlSurfaces;
  lateralMode: LateralMode;
  verticalMode: VerticalMode;
  speedMode: SpeedMode;
  engaged: boolean;
  annunciations: string[];
  crossTrackM?: number;
  locCaptured: boolean;
  gsCaptured: boolean;
}

export class AutopilotSystem {
  private lateralMode: LateralMode = 'OFF';
  private verticalMode: VerticalMode = 'OFF';
  private speedMode: SpeedMode = 'OFF';
  private engaged = false;
  private targets: AutopilotTargets = {
    headingDeg: 0,
    altitudeM: 3000,
    vsMS: 0,
    speedMS: 130,
  };
  private limits: AutopilotLimits = {
    maxBankDeg: 27,
    maxPitchDeg: 15,
    maxVsMS: 12.7, // 2500 fpm
    maxThrottleRate: 0.3,
  };

  // PIDs
  private hdgPID: PID;
  private altPID: PID;
  private vsPID: PID;
  private speedPID: PID;
  private navPID: PID;
  private ilsLocPID: PID;
  private ilsGsPID: PID;
  private pitchPID: PID;
  private rollPID: PID;

  private locCaptured = false;
  private gsCaptured = false;

  constructor(limits?: Partial<AutopilotLimits>) {
    if (limits) this.limits = { ...this.limits, ...limits };
    // Tuned PIDs
    this.hdgPID = new PID({ kp: 0.8, ki: 0.05, kd: 0.3, integralLimit: 20, outputLimit: this.limits.maxBankDeg });
    this.altPID = new PID({ kp: 0.008, ki: 0.0005, kd: 0.015, integralLimit: 500, outputLimit: this.limits.maxVsMS });
    this.vsPID = new PID({ kp: 0.6, ki: 0.1, kd: 0.15, integralLimit: 10, outputLimit: this.limits.maxPitchDeg });
    this.speedPID = new PID({ kp: 0.03, ki: 0.01, kd: 0.005, integralLimit: 20, outputLimit: 1.0 });
    this.navPID = new PID({ kp: 0.0006, ki: 0.00001, kd: 0.0008, integralLimit: 1000, outputLimit: this.limits.maxBankDeg });
    this.ilsLocPID = new PID({ kp: 18, ki: 0.8, kd: 6, integralLimit: 5, outputLimit: this.limits.maxBankDeg });
    this.ilsGsPID = new PID({ kp: -4.5, ki: -0.2, kd: -1.2, integralLimit: 5, outputLimit: this.limits.maxPitchDeg });
    this.pitchPID = new PID({ kp: 1.8, ki: 0.2, kd: 0.6, integralLimit: 5, outputLimit: 1 });
    this.rollPID = new PID({ kp: 1.2, ki: 0.15, kd: 0.4, integralLimit: 10, outputLimit: 1 });
  }

  engage(): void {
    this.engaged = true;
    this.resetPIDs();
  }
  disengage(): void {
    this.engaged = false;
    this.lateralMode = 'OFF';
    this.verticalMode = 'OFF';
    this.speedMode = 'OFF';
    this.locCaptured = false;
    this.gsCaptured = false;
  }

  setMode(lateral: LateralMode, vertical: VerticalMode, speed: SpeedMode) {
    this.lateralMode = lateral;
    this.verticalMode = vertical;
    this.speedMode = speed;
    if (lateral !== 'ILS_LOC' && lateral !== 'APP') this.locCaptured = false;
    if (vertical !== 'ILS_GS' && vertical !== 'GS') this.gsCaptured = false;
    this.resetPIDs();
  }

  setTargets(t: Partial<AutopilotTargets>) {
    this.targets = { ...this.targets, ...t };
  }

  getTargets() { return this.targets; }
  isEngaged() { return this.engaged; }
  getModes() { return { lateral: this.lateralMode, vertical: this.verticalMode, speed: this.speedMode }; }

  private resetPIDs() {
    this.hdgPID.reset(); this.altPID.reset(); this.vsPID.reset();
    this.speedPID.reset(); this.navPID.reset(); this.ilsLocPID.reset(); this.ilsGsPID.reset();
    this.pitchPID.reset(); this.rollPID.reset();
  }

  /** Shortest angle between -180..180 */
  static headingError(target: number, current: number): number {
    let err = target - current;
    while (err > 180) err -= 360;
    while (err < -180) err += 360;
    return err;
  }

  /** HDG mode: bank = PID(heading error) */
  private computeHDG(currentHdg: number, dt: number): number {
    const err = AutopilotSystem.headingError(this.targets.headingDeg, currentHdg);
    // Предкомпенсация: требуемый bank для coordinated turn: tan(bank) = (V * headingRate)/g
    // Но PID проще
    const bankCmdDeg = this.hdgPID.update(err, dt);
    return bankCmdDeg;
  }

  /** NAV mode: LNAV по cross track error */
  private computeNAV(state: AircraftState, dt: number): number {
    const xte = this.targets.navCrossTrackErrorM ?? 0; // positive right
    const bearingErr = AutopilotSystem.headingError(this.targets.navBearingDeg ?? this.targets.headingDeg, state.attitude.yawDeg);
    // Смешанный закон: bank = k1* bearingErr + k2* xte
    const bankFromBrg = bearingErr * 0.6;
    const bankFromXte = this.navPID.update(-xte, dt); // - чтобы возвращать к центру
    let bank = bankFromBrg + bankFromXte;
    bank = Math.max(-this.limits.maxBankDeg, Math.min(this.limits.maxBankDeg, bank));
    // Intercept angle limit 45 deg
    return bank;
  }

  /** ILS Localizer: отклонение в градусах преобразуем в требуемый bank */
  private computeILS_LOC(state: AircraftState, dt: number): number {
    if (!this.targets.ils) return this.computeHDG(this.targets.headingDeg, dt);
    const locDev = this.targets.ils.localizerDevDeg; // + right
    if (!this.locCaptured && Math.abs(locDev) < 0.8) this.locCaptured = true;
    if (!this.locCaptured) {
      // Intercept heading 30 deg to runway
      const interceptHdg = this.targets.ils.runwayHeadingDeg + Math.sign(locDev) * -30;
      const err = AutopilotSystem.headingError(interceptHdg, state.attitude.yawDeg);
      return Math.max(-this.limits.maxBankDeg, Math.min(this.limits.maxBankDeg, err * 0.9));
    }
    // Captured: PID по LocDev
    const bank = this.ilsLocPID.update(locDev, dt);
    // Учет crab? Пока без
    return bank;
  }

  /** ALT HOLD: output -> target VS, затем в pitch */
  private computeALT(altM: number, vsMS: number, dt: number): number {
    const altErr = this.targets.altitudeM - altM;
    // ALT PID дает желаемую VS
    const targetVs = this.altPID.update(altErr, dt);
    // Теперь VS PID -> pitch
    return this.computeVS(targetVs, vsMS, dt);
  }

  /** VS mode: pitch = PID(vs error) */
  private computeVS(targetVs: number, currentVs: number, dt: number): number {
    const limitedVs = Math.max(-this.limits.maxVsMS, Math.min(this.limits.maxVsMS, targetVs));
    const err = limitedVs - currentVs;
    const pitchCmd = this.vsPID.update(err, dt);
    return pitchCmd;
  }

  /** GS capture: glideslope dev -> pitch */
  private computeILS_GS(state: AircraftState, dt: number): number {
    if (!this.targets.ils) return this.computeALT(state.pos.altM, state.vel.vsMS, dt);
    const gsDev = this.targets.ils.glideslopeDevDeg; // + above
    if (!this.gsCaptured && Math.abs(gsDev) < 0.7 && this.locCaptured) this.gsCaptured = true;
    if (!this.gsCaptured) {
      // Hold altitude until capture
      return this.computeALT(state.pos.altM, state.vel.vsMS, dt);
    }
    // GS PID: отклонение -> коррекция pitch, но инвертировано: если выше, нужно больше вниз
    const pitchCorr = this.ilsGsPID.update(gsDev, dt);
    // Прибавляем базовый pitch для -3deg path: approx -3 deg
    // FPA ~ Vs / TAS. Для 3deg: Vs = TAS * sin(3deg) ~ TAS*0.0524
    const tas = state.vel.tasMS;
    const nominalVs = -tas * 0.0524;
    const vsErr = nominalVs - state.vel.vsMS;
    const basePitch = vsErr * 0.5;
    return basePitch + pitchCorr;
  }

  /** SPD / Autothrottle */
  private computeSPD(state: AircraftState, dt: number): number {
    // Управляем throttle на поддержание IAS
    const currentIAS = state.vel.iasMS;
    const targetIAS = this.targets.speedMS;
    const err = targetIAS - currentIAS; // + если медленно
    const thrCmdDelta = this.speedPID.update(err, dt);
    return thrCmdDelta;
  }

  /** Основной цикл AP */
  update(state: AircraftState, prevControls: ControlSurfaces, dt: number): AutopilotOutput {
    const annunciations: string[] = [];
    if (!this.engaged) {
      return {
        controls: prevControls,
        lateralMode: 'OFF',
        verticalMode: 'OFF',
        speedMode: 'OFF',
        engaged: false,
        annunciations: ['AP OFF'],
        locCaptured: false,
        gsCaptured: false,
      };
    }

    let targetBankDeg = 0;
    let targetPitchDeg = 0;
    let throttleDelta = 0;

    // Lateral
    switch (this.lateralMode) {
      case 'HDG':
        targetBankDeg = this.computeHDG(state.attitude.yawDeg, dt);
        annunciations.push(`HDG ${this.targets.headingDeg.toFixed(0)}°`);
        break;
      case 'NAV':
        targetBankDeg = this.computeNAV(state, dt);
        annunciations.push(`NAV XTE ${ (this.targets.navCrossTrackErrorM ?? 0).toFixed(0)}m`);
        break;
      case 'APP':
      case 'ILS_LOC':
        targetBankDeg = this.computeILS_LOC(state, dt);
        annunciations.push(this.locCaptured ? 'LOC CAP' : 'LOC ARM');
        break;
      default:
        targetBankDeg = 0;
    }

    // Vertical
    switch (this.verticalMode) {
      case 'ALT':
        targetPitchDeg = this.computeALT(state.pos.altM, state.vel.vsMS, dt);
        annunciations.push(`ALT ${ (this.targets.altitudeM * 3.28084).toFixed(0)}ft`);
        break;
      case 'VS':
        targetPitchDeg = this.computeVS(this.targets.vsMS, state.vel.vsMS, dt);
        annunciations.push(`VS ${ (this.targets.vsMS * 196.85).toFixed(0)} fpm`);
        break;
      case 'GS':
      case 'ILS_GS':
        targetPitchDeg = this.computeILS_GS(state, dt);
        annunciations.push(this.gsCaptured ? 'GS CAP' : 'GS ARM');
        break;
      default:
        targetPitchDeg = 0;
    }

    // Speed
    if (this.speedMode !== 'OFF') {
      throttleDelta = this.computeSPD(state, dt);
      annunciations.push(`SPD ${ (this.targets.speedMS * 1.94384).toFixed(0)} kt`);
    }

    // Конвертация bank/pitch -> control surfaces через PID
    // Desired roll = targetBankDeg, current roll = state.attitude.rollDeg => error -> aileron
    const bankError = targetBankDeg - state.attitude.rollDeg;
    const aileronCmd = this.rollPID.update(bankError, dt);
    const pitchError = targetPitchDeg - state.attitude.pitchDeg;
    const elevatorCmd = this.pitchPID.update(pitchError, dt);

    // Limit surfaces
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

    const newControls: ControlSurfaces = { ...prevControls };
    newControls.aileron = clamp(aileronCmd, -1, 1);
    newControls.elevator = clamp(elevatorCmd, -1, 1);

    // Throttle
    if (this.speedMode !== 'OFF') {
      let newThrottle = prevControls.throttle + throttleDelta * dt;
      newThrottle = clamp(newThrottle, 0, 1);
      // Rate limit
      const maxDelta = this.limits.maxThrottleRate * dt;
      newThrottle = clamp(newThrottle, prevControls.throttle - maxDelta, prevControls.throttle + maxDelta);
      newControls.throttle = newThrottle;
    }

    // Rudder - координированный поворот + выравнивание при ILS
    const yawRateDesired = (targetBankDeg * Math.PI / 180) * 9.81 / Math.max(state.vel.tasMS, 30);
    const rudderCmd = clamp((yawRateDesired - state.angVel.r) * 0.3, -0.5, 0.5);
    newControls.rudder = rudderCmd;

    return {
      controls: newControls,
      lateralMode: this.lateralMode,
      verticalMode: this.verticalMode,
      speedMode: this.speedMode,
      engaged: true,
      annunciations,
      locCaptured: this.locCaptured,
      gsCaptured: this.gsCaptured,
      crossTrackM: this.targets.navCrossTrackErrorM,
    };
  }

  /** Расчет NAV: bearing и cross track от текущего к цели */
  static computeNavData(currentLat: number, currentLon: number, targetLat: number, targetLon: number): { bearingDeg: number; distanceM: number; xteM: number } {
    // Haversine distance + bearing
    const R = 6371000;
    const toRad = (d: number) => d * Math.PI / 180;
    const toDeg = (r: number) => r * 180 / Math.PI;
    const dLat = toRad(targetLat - currentLat);
    const dLon = toRad(targetLon - currentLon);
    const lat1 = toRad(currentLat), lat2 = toRad(targetLat);
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const dist = R * c;
    const y = Math.sin(dLon)*Math.cos(lat2);
    const x = Math.cos(lat1)*Math.sin(lat2) - Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLon);
    const brg = (toDeg(Math.atan2(y,x)) + 360) % 360;
    // XTE approximated as 0 if no path defined (needs 2 points). Here 0.
    return { bearingDeg: brg, distanceM: dist, xteM: 0 };
  }

  /** ILS отклонения: localizer = lateral angular error, glideslope = vertical angular error относительно 3° */
  static computeILSDeviation(
    acLat: number, acLon: number, acAltM: number,
    rwyLat: number, rwyLon: number, rwyAltM: number, rwyHeadingDeg: number
  ): { locDevDeg: number; gsDevDeg: number; distanceM: number } {
    const nav = AutopilotSystem.computeNavData(acLat, acLon, rwyLat, rwyLon);
    const toRad = (d:number)=> d*Math.PI/180;
    const toDeg = (r:number)=> r*180/Math.PI;
    // Relative bearing to runway threshold
    const bearingToRwy = nav.bearingDeg;
    // Localizer deviation: difference between bearing and runway reciprocal? Simplified: heading deviation
    // LOC is aligned runway heading. Deviation = bearing to rwy - rwyHeading (if approaching)
    // For approach, we come opposite runway direction.
    const approachCrs = (rwyHeadingDeg + 180) % 360; // direction from runway outward
    let locErr = bearingToRwy - rwyHeadingDeg + 180; // shift
    while (locErr > 180) locErr -= 360;
    while (locErr < -180) locErr += 360;
    // Scale: ~2.5 degrees = full scale = 150m at distance; approximate dev = arctan(crossTrack / distance)
    // We'll compute cross track more accurately: sin(bearing difference)*distance
    const offCrs = toRad(bearingToRwy - approachCrs);
    const crossTrackM = Math.sin(offCrs) * nav.distanceM;
    const locDevDeg = toDeg(Math.atan2(crossTrackM, nav.distanceM)) * 1.5; // scale

    // Glideslope: desired ALT = rwyAlt + distance * tan(3°)
    const desiredAlt = rwyAltM + nav.distanceM * Math.tan(toRad(3.0));
    const altErr = acAltM - desiredAlt;
    const gsDevDeg = toDeg(Math.atan2(altErr, nav.distanceM)); // + above
    return { locDevDeg: Math.max(-2.5, Math.min(2.5, locDevDeg)), gsDevDeg: Math.max(-2.0, Math.min(2.0, gsDevDeg)), distanceM: nav.distanceM };
  }
}
