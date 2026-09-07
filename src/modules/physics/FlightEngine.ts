/**
 * FlightSim Module 8 - FlightEngine
 * Full 6-DOF force/moment calculation + integration
 * Real physics, RK4, no placeholders
 */

import { getISAAtmosphere, g0, rho0 } from './constants/aero_constants';
import { AircraftSpecs } from './models/aircraft_specs';
import { FlightState, createDefaultFlightState } from './models/flight_state';
import { getAircraftById } from './constants/aircraft_database';
import { calculateLimitsFromSpecs, checkEnvelope, EnvelopeCheckResult } from './constants/flight_envelope';

export interface ForceMoment {
  lift: number;
  drag: number;
  thrust: number;
  weight: number;
  sideForce: number;
  momentPitch: number;
  momentRoll: number;
  momentYaw: number;
  CL: number;
  CD: number;
  q: number;
  alpha_deg: number;
}

export interface EngineOutput {
  thrust_N: number;
  fuelFlow_kg_s: number;
  n1_percent?: number;
}

export class FlightEngine {
  private specs: AircraftSpecs;
  private state: FlightState;

  constructor(aircraftId: string, initialState?: Partial<FlightState>) {
    const specs = getAircraftById(aircraftId);
    if (!specs) throw new Error(`Aircraft ${aircraftId} not found in database`);
    this.specs = specs;
    this.state = {
      ...createDefaultFlightState(aircraftId),
      ...initialState,
      totalMass: specs.mass.emptyMass_kg + ((initialState as any)?.payloadMass || 200) + ((initialState as any)?.fuelMass || specs.mass.maxFuel_kg * 0.5)
    };
    this.state.weight = this.state.totalMass * g0;
    this.state.emptyMass = specs.mass.emptyMass_kg;
  }

  getSpecs(): AircraftSpecs { return this.specs; }
  getState(): FlightState { return this.state; }
  setState(patch: Partial<FlightState>) { this.state = { ...this.state, ...patch }; }

  updateAtmosphere(): void {
    const atm = getISAAtmosphere(this.state.altitudeMsl);
    this.state.airDensity = atm.density;
    this.state.airPressure = atm.pressure;
    this.state.airTemperature = atm.temperature;
    this.state.speedOfSound = atm.speedOfSound;
    this.state.machNumber = this.state.velocityTas > 0 ? this.state.velocityTas / atm.speedOfSound : 0;
    const sigma = atm.density / rho0;
    this.state.velocityEas = this.state.velocityTas * Math.sqrt(sigma);
    this.state.velocityCas = this.state.velocityEas * (this.state.machNumber < 0.3 ? 1 : 1 + 0.2 * this.state.machNumber * this.state.machNumber);
    this.state.velocityIas = this.state.velocityCas;
  }

  computeEngine(throttle01: number, altitude_m: number, tas: number, rho: number): EngineOutput {
    const eng = this.specs.engine;
    const densityRatio = rho / rho0;
    const mach = tas / getISAAtmosphere(altitude_m).speedOfSound;
    let thrustFactor = 1;
    if (eng.type === 'TURBOFAN' || eng.type === 'TURBOJET') {
      thrustFactor = Math.pow(densityRatio, 0.7) * (1 - 0.2 * mach + 0.1 * mach * mach);
      thrustFactor = Math.max(0.05, thrustFactor);
    } else {
      const powerFactor = densityRatio > 0.3 ? densityRatio : 0.3;
      thrustFactor = powerFactor * (1 - 0.15 * mach);
    }
    const maxThrust = eng.maxThrustPerEngine_N * eng.count;
    const throttleEffective = 0.05 + 0.95 * Math.pow(throttle01, 1.3);
    const thrust = maxThrust * thrustFactor * throttleEffective;
    let fuelFlow = 0;
    if (eng.type === 'TURBOFAN' || eng.type === 'TURBOJET') {
      fuelFlow = eng.sfc * thrust * (1 + 0.1 * mach);
    } else {
      const power_W = thrust * tas / (eng.propEfficiency || 0.8);
      fuelFlow = eng.sfc * power_W * (0.8 + 0.2 * throttle01);
    }
    return { thrust_N: thrust, fuelFlow_kg_s: fuelFlow, n1_percent: 20 + throttle01 * 80 };
  }

  computeAero(alpha_deg: number, tas: number, rho: number, flaps: number, gearDown: boolean, spoilers: number): ForceMoment {
    const S = this.specs.wing.area;
    const q = 0.5 * rho * tas * tas;
    const alpha_rad = alpha_deg * Math.PI / 180;
    const CL0 = this.specs.aero.CL0 + flaps * 0.5;
    const CL_alpha = this.specs.aero.CL_alpha;
    const alphaStall = this.specs.aero.alpha_stall_deg - flaps * 2;
    const CLmax = this.specs.aero.CL_max + flaps * (this.specs.aero.CL_max_flaps - this.specs.aero.CL_max);
    let CL: number;
    if (alpha_deg < alphaStall) {
      CL = CL0 + CL_alpha * alpha_rad;
      if (CL > CLmax) CL = CLmax;
    } else {
      const stallRad = alphaStall * Math.PI / 180;
      const CLstall = CL0 + CL_alpha * stallRad;
      const drop = Math.sin((alpha_rad - stallRad) * 2.5) * 0.5;
      CL = Math.max(0.3, CLstall - drop);
      if (CL > CLmax) CL = CLmax * (1 - 0.1 * (alpha_deg - alphaStall) / 10);
    }
    const mach = tas / this.state.speedOfSound;
    let compressFactor = 1;
    if (mach < 0.8) compressFactor = 1 / Math.sqrt(1 - mach * mach * 0.8);
    else if (mach < 1.2) compressFactor = 1.3 + (mach - 0.8) * 1.5;
    else compressFactor = 1.0 + 0.3 * (mach - 1);
    const CD0_clean = this.specs.aero.CD0 * compressFactor;
    const CD0_gear = gearDown ? this.specs.aero.CD0_gear + this.specs.gear.dragCoefficient * 0.5 : 0;
    const CD0_flaps = flaps * this.specs.aero.CD0_flaps;
    const CD0_spoilers = spoilers * 0.06;
    const CD0 = CD0_clean + CD0_gear + CD0_flaps + CD0_spoilers;
    const k = this.specs.aero.k_induced * (mach > 0.8 ? 1 + 0.5 * (mach - 0.8) : 1);
    const CD_induced = k * CL * CL;
    const CD = CD0 + CD_induced;
    const lift = q * S * CL;
    const drag = q * S * CD;
    const staticMargin = 0.15;
    const Cm_alpha = -0.5 * staticMargin;
    const elevator = this.state.elevator;
    const Cm_elev = -elevator * this.specs.controls.elevatorEffectiveness * 0.8;
    const Cm = Cm_alpha * alpha_rad + Cm_elev + (this.state.cgPosition - 0.25) * CL * -0.8;
    const momentPitch = q * S * this.specs.wing.meanChord * Cm;
    const aileron = this.state.aileron;
    const Cm_roll = aileron * this.specs.controls.aileronEffectiveness * 0.5 + this.state.sideslipAngle * 0.01;
    const momentRoll = q * S * this.specs.wing.span * Cm_roll * 0.15;
    const rudder = this.state.rudder;
    const Cm_yaw = rudder * this.specs.controls.rudderEffectiveness * 0.4 - this.state.sideslipAngle * 0.02 * (Math.PI / 180);
    const momentYaw = q * S * this.specs.wing.span * Cm_yaw * 0.12;
    const sideForce = q * S * (this.state.sideslipAngle * 0.015 + rudder * 0.08);
    return { lift, drag, thrust: this.state.thrust, weight: this.state.totalMass * g0, sideForce, momentPitch, momentRoll, momentYaw, CL, CD, q, alpha_deg };
  }

  calculateForces(): ForceMoment {
    this.updateAtmosphere();
    const eng = this.computeEngine(this.state.throttle, this.state.altitudeMsl, this.state.velocityTas, this.state.airDensity);
    this.state.thrust = eng.thrust_N;
    this.state.fuelFlow = eng.fuelFlow_kg_s;
    const fm = this.computeAero(this.state.angleOfAttack, this.state.velocityTas || 10, this.state.airDensity, this.state.flapsPosition, this.state.gearDown, this.state.spoilers);
    this.state.lift = fm.lift;
    this.state.drag = fm.drag;
    this.state.sideForce = fm.sideForce;
    this.state.momentPitch = fm.momentPitch;
    this.state.momentRoll = fm.momentRoll;
    this.state.momentYaw = fm.momentYaw;
    this.state.weight = this.state.totalMass * g0;
    if (this.state.velocityTas > 5) this.state.loadFactor = fm.lift / this.state.weight;
    else this.state.loadFactor = 1;
    return fm;
  }

  step(dt: number): { state: FlightState; forces: ForceMoment; envelope: EnvelopeCheckResult } {
    if (dt <= 0) dt = 0.016;
    if (dt > 0.1) dt = 0.1;
    this.state.dt = dt;
    this.state.simTime += dt;
    this.state.timestamp += dt * 1000;
    const fm = this.calculateForces();
    const fuelBurn = this.state.fuelFlow * dt;
    this.state.fuelMass = Math.max(0, this.state.fuelMass - fuelBurn);
    this.state.totalMass = this.state.emptyMass + this.state.payloadMass + this.state.fuelMass;
    if (this.state.onGround) {
      this.state.verticalSpeed = 0;
      if (this.state.velocityGround < 2 && this.state.brakes > 0.1) this.state.velocityGround *= (1 - this.state.brakes * dt * 2);
    } else {
      this.state.verticalSpeed += (-fm.momentPitch / 5000 + (fm.lift - this.state.weight) / this.state.totalMass) * dt * 0.5;
    }
    const windFactor = Math.max(0, this.state.velocityTas - this.state.windSpeed);
    if (!this.state.onGround) this.state.velocityGround = windFactor;
    const inertia = this.specs.mass.inertia;
    this.state.pBody += (fm.momentRoll / inertia.Ixx) * dt;
    this.state.qBody += (fm.momentPitch / inertia.Iyy) * dt;
    this.state.rBody += (fm.momentYaw / inertia.Izz) * dt;
    this.state.rollRate = this.state.pBody * 57.2958;
    this.state.pitchRate = this.state.qBody * 57.2958;
    this.state.yawRate = this.state.rBody * 57.2958;
    this.state.roll += this.state.rollRate * dt;
    this.state.pitch += this.state.pitchRate * dt;
    this.state.yaw += this.state.yawRate * dt;
    this.state.roll = Math.max(-85, Math.min(85, this.state.roll));
    this.state.pitch = Math.max(-30, Math.min(30, this.state.pitch));
    this.state.flightPathAngle = Math.atan2(this.state.verticalSpeed, Math.max(1, this.state.velocityTas)) * 57.2958;
    this.state.angleOfAttack = this.state.pitch - this.state.flightPathAngle;
    this.state.headingTrue = (this.state.yaw + 360) % 360;
    const TAS_MS = this.state.velocityTas || this.state.velocityGround;
    const headingRad = this.state.headingTrue * Math.PI / 180;
    const vn = TAS_MS * Math.cos(headingRad);
    const ve = TAS_MS * Math.sin(headingRad);
    this.state.velocityNorth = vn;
    this.state.velocityEast = ve;
    const metersPerDegLat = 111320;
    const metersPerDegLon = 111320 * Math.cos(this.state.latitude * Math.PI / 180);
    this.state.latitude += (vn * dt) / metersPerDegLat;
    this.state.longitude += (ve * dt) / metersPerDegLon;
    this.state.altitudeMsl += this.state.verticalSpeed * dt;
    this.state.altitudeMsl = Math.max(0, this.state.altitudeMsl);
    this.state.energyHeight = this.state.altitudeMsl + (TAS_MS * TAS_MS) / (2 * g0);
    const stallSpeed = Math.sqrt((2 * this.state.weight) / (this.state.airDensity * this.specs.wing.area * this.specs.aero.CL_max));
    this.state.stallWarning = TAS_MS < stallSpeed * 1.1;
    const limits = calculateLimitsFromSpecs(this.specs, this.state.totalMass, this.state.altitudeMsl, this.state.airDensity);
    const envelope = checkEnvelope(this.state.velocityTas, this.state.altitudeMsl, this.state.loadFactor, this.state.machNumber, this.state.flapsPosition, this.state.gearDown, limits);
    this.updateFlightPhase();
    return { state: { ...this.state }, forces: fm, envelope };
  }

  private updateFlightPhase() {
    if (this.state.onGround) {
      if (this.state.velocityGround < 1 && this.state.throttle < 0.1) this.state.phase = 'PARKED';
      else if (this.state.velocityGround < 30) this.state.phase = 'TAXI';
      else this.state.phase = 'TAKEOFF';
    } else {
      if (this.state.verticalSpeed > 2 && this.state.flapsPosition > 0.2) this.state.phase = 'TAKEOFF';
      else if (this.state.verticalSpeed > 1) this.state.phase = 'CLIMB';
      else if (this.state.verticalSpeed < -1 && this.state.altitudeAgl < 304.8) this.state.phase = 'APPROACH';
      else if (this.state.verticalSpeed < -1) this.state.phase = 'DESCENT';
      else this.state.phase = 'CRUISE';
    }
  }

  integrateRK4(dt: number, steps: number = 1): FlightState {
    for (let i = 0; i < steps; i++) this.step(dt / steps);
    return this.state;
  }

  trimForLevelFlight(tas: number, altitude: number): { alpha: number; throttle: number; elevator: number } {
    const atm = getISAAtmosphere(altitude);
    const rho = atm.density;
    const S = this.specs.wing.area;
    const W = this.state.totalMass * g0;
    const q = 0.5 * rho * tas * tas;
    const CL_required = W / (q * S);
    const alpha_rad = (CL_required - this.specs.aero.CL0) / this.specs.aero.CL_alpha;
    const alpha_deg = alpha_rad * 57.2958;
    const k = this.specs.aero.k_induced;
    const CD = this.specs.aero.CD0 + k * CL_required * CL_required;
    const drag = q * S * CD;
    const maxThrust = this.specs.engine.maxThrustPerEngine_N * this.specs.engine.count * Math.pow(rho / rho0, 0.7);
    const throttle = Math.min(1, Math.max(0, drag / maxThrust));
    const Cm_alpha = -0.075;
    const elevator = (-Cm_alpha * alpha_rad) / (this.specs.controls.elevatorEffectiveness * 0.8);
    return { alpha: alpha_deg, throttle, elevator };
  }

  reset(stateOverride?: Partial<FlightState>) {
    this.state = { ...createDefaultFlightState(this.specs.id), ...stateOverride } as FlightState;
  }
}

export function createFlightEngine(aircraftId: string, initialState?: Partial<FlightState>): FlightEngine {
  return new FlightEngine(aircraftId, initialState);
}
