/**
 * FlightSim Module 8 - Flight Envelope
 * V-n diagram, operating limits, stall speeds, flutter guards
 */

import { AircraftSpecs } from '../models/aircraft_specs';
import { rho0, g0 } from './aero_constants';

export interface FlightEnvelopeLimits {
  Vs0_ms: number;
  Vs1_ms: number;
  Vfe_ms: number;
  Vle_ms: number;
  Vno_ms: number;
  Vne_ms: number;
  Mmo: number;
  maxAltitude_m: number;
  maxMach: number;
  maxLoadFactor: number;
  minLoadFactor: number;
  maxDynamicPressure_Pa: number;
}

export interface EnvelopeCheckResult {
  inside: boolean;
  violations: string[];
  stallMargin: number;
  speedMargin: number;
  gMargin: number;
  altitudeMargin_m: number;
}

export function calculateLimitsFromSpecs(specs: AircraftSpecs, mass_kg: number, altitude_m: number, rho: number): FlightEnvelopeLimits {
  const KTS_TO_MS = 0.514444;
  const FT_TO_M = 0.3048;
  const W = mass_kg * g0;
  const S = specs.wing.area;
  const Vs0_calc = Math.sqrt((2 * W) / (rho * S * specs.aero.CL_max_flaps));
  const Vs1_calc = Math.sqrt((2 * W) / (rho * S * specs.aero.CL_max));
  const Vfe_ms = specs.vSpeeds.Vfe_kts * KTS_TO_MS;
  const Vle_ms = specs.vSpeeds.Vle_kts * KTS_TO_MS;
  const Vno_ms = specs.vSpeeds.Vno_kts * KTS_TO_MS;
  const Vne_ms = specs.vSpeeds.Vne_kts * KTS_TO_MS;
  const Mmo = specs.cruiseMach * 1.15;
  const maxAlt_m = specs.maxOperatingAlt_ft * FT_TO_M;
  const maxMach = specs.category === 'SUPERSONIC' ? 2.2 : Mmo;
  let maxG = 2.5;
  let minG = -1.0;
  if (specs.category === 'GA_SINGLE') { maxG = 3.8; minG = -1.52; }
  const maxQ = 0.5 * rho0 * Vne_ms * Vne_ms;
  return {
    Vs0_ms: Vs0_calc,
    Vs1_ms: Vs1_calc,
    Vfe_ms,
    Vle_ms,
    Vno_ms,
    Vne_ms,
    Mmo,
    maxAltitude_m: maxAlt_m,
    maxMach,
    maxLoadFactor: maxG,
    minLoadFactor: minG,
    maxDynamicPressure_Pa: maxQ
  };
}

export function checkEnvelope(
  tas_ms: number,
  altitude_m: number,
  loadFactor: number,
  mach: number,
  flaps: number,
  gearDown: boolean,
  limits: FlightEnvelopeLimits
): EnvelopeCheckResult {
  const violations: string[] = [];
  if (tas_ms < limits.Vs1_ms * 0.95) violations.push(`STALL RISK: TAS ${tas_ms.toFixed(1)} < Vs1 ${limits.Vs1_ms.toFixed(1)}`);
  if (flaps > 0.1 && tas_ms > limits.Vfe_ms) violations.push(`VFE EXCEEDED: ${tas_ms.toFixed(1)} > ${limits.Vfe_ms.toFixed(1)}`);
  if (gearDown && tas_ms > limits.Vle_ms) violations.push(`VLE EXCEEDED`);
  if (tas_ms > limits.Vne_ms) violations.push(`VNE EXCEEDED: ${tas_ms.toFixed(1)} > ${limits.Vne_ms.toFixed(1)}`);
  if (mach > limits.maxMach + 0.05) violations.push(`MMO EXCEEDED: M${mach.toFixed(2)} > ${limits.maxMach.toFixed(2)}`);
  if (altitude_m > limits.maxAltitude_m) violations.push(`CEILING EXCEEDED: ${altitude_m.toFixed(0)} > ${limits.maxAltitude_m.toFixed(0)}`);
  if (loadFactor > limits.maxLoadFactor) violations.push(`G-LIMIT +: ${loadFactor.toFixed(2)} > ${limits.maxLoadFactor}`);
  if (loadFactor < limits.minLoadFactor) violations.push(`G-LIMIT -: ${loadFactor.toFixed(2)} < ${limits.minLoadFactor}`);
  const stallMargin = tas_ms / limits.Vs1_ms;
  return {
    inside: violations.length === 0,
    violations,
    stallMargin,
    speedMargin: limits.Vne_ms - tas_ms,
    gMargin: limits.maxLoadFactor - loadFactor,
    altitudeMargin_m: limits.maxAltitude_m - altitude_m
  };
}

export interface VnPoint { speed_ms: number; loadFactor: number; }

export function generateVnDiagram(specs: AircraftSpecs, mass_kg: number, rho: number) {
  const limits = calculateLimitsFromSpecs(specs, mass_kg, 0, rho);
  const Vs1 = limits.Vs1_ms;
  const Vne = limits.Vne_ms;
  const speeds: number[] = [];
  for (let i = 0; i <= 50; i++) speeds.push(Vs1 * 0.8 + (Vne * 1.1 - Vs1 * 0.8) * (i / 50));
  const maneuver = speeds.map(v => {
    const nStall = Math.pow(v / Vs1, 2);
    return { speed_ms: v, loadFactor: Math.min(nStall, limits.maxLoadFactor) };
  });
  const gust = speeds.map(v => {
    const Ude = 15;
    const CL_a = specs.aero.CL_alpha;
    const W = mass_kg * g0;
    const delta_n = (rho * v * CL_a * Ude * specs.wing.area) / (2 * W);
    return { speed_ms: v, loadFactor: 1 + delta_n };
  });
  return { maneuver, gust, limits };
}

export function isSafeToExtendFlaps(tas: number, limits: FlightEnvelopeLimits): boolean {
  return tas <= limits.Vfe_ms;
}
export function isSafeToExtendGear(tas: number, limits: FlightEnvelopeLimits): boolean {
  return tas <= limits.Vle_ms;
}
export function getStallSpeed(specs: AircraftSpecs, mass_kg: number, rho: number, flaps: number, loadFactor: number): number {
  const CLmax = specs.aero.CL_max + flaps * (specs.aero.CL_max_flaps - specs.aero.CL_max);
  const W = mass_kg * g0 * Math.abs(loadFactor || 1);
  return Math.sqrt((2 * W) / (rho * specs.wing.area * CLmax));
}
