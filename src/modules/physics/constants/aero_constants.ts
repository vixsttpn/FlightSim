/**
 * FlightSim Module 8 - Physics Constants
 * ISA Standard Atmosphere + Universal Physical Constants
 */

// =================== Universal Physics ===================
export const g0 = 9.80665; // m/s² standard gravity
export const G = 6.67430e-11; // universal gravitational constant
export const R = 287.05287; // J/(kg·K) - specific gas constant for dry air
export const R_UNIVERSAL = 8.314462618; // J/(mol·K)
export const M_AIR = 0.0289644; // kg/mol molar mass of air

// =================== Sea Level ISA ===================
export const P0 = 101325; // Pa sea level pressure
export const T0 = 288.15; // K sea level temperature (15°C)
export const rho0 = 1.225; // kg/m³ sea level density
export const T_LAPSE_RATE = 0.0065; // K/m troposphere lapse rate
export const TROPOPAUSE_ALT = 11000; // m
export const STRATOSPHERE_TEMP = 216.65; // K constant in lower stratosphere

// =================== Atmosphere Physics ===================
export const GAMMA = 1.4; // adiabatic index for air
export const SPEED_OF_SOUND_SL = 340.294; // m/s at sea level ISA
export const MU_SUTHERLAND_REF = 1.716e-5; // kg/(m·s) ref viscosity
export const SUTHERLAND_S = 111.0; // K Sutherland constant
export const T_SUTHERLAND_REF = 273.15; // K reference for Sutherland

// =================== Earth ===================
export const EARTH_RADIUS = 6371000; // m mean radius
export const EARTH_OMEGA = 7.2921159e-5; // rad/s Earth rotation

// =================== Unit Conversions ===================
export const KTS_TO_MS = 0.514444;
export const MS_TO_KTS = 1.94384;
export const FT_TO_M = 0.3048;
export const M_TO_FT = 3.28084;
export const NM_TO_M = 1852;
export const LBS_TO_KG = 0.453592;
export const KG_TO_LBS = 2.20462;

// =================== ISA Atmosphere Model ===================
export interface AtmosphereState {
  altitude: number;      // m
  temperature: number;   // K
  pressure: number;      // Pa
  density: number;       // kg/m³
  speedOfSound: number;  // m/s
  viscosity: number;     // kg/(m·s)
}

export function getISAAtmosphere(altitudeM: number): AtmosphereState {
  let T: number, P: number;

  if (altitudeM <= TROPOPAUSE_ALT) {
    // Troposphere
    T = T0 - T_LAPSE_RATE * altitudeM;
    P = P0 * Math.pow(T / T0, g0 / (R * T_LAPSE_RATE));
  } else if (altitudeM <= 20000) {
    // Lower Stratosphere (isothermal)
    T = STRATOSPHERE_TEMP;
    const P1 = P0 * Math.pow(STRATOSPHERE_TEMP / T0, g0 / (R * T_LAPSE_RATE));
    P = P1 * Math.exp(-g0 * (altitudeM - TROPOPAUSE_ALT) / (R * T));
  } else {
    // Upper approximation - isothermal extrapolation
    T = STRATOSPHERE_TEMP;
    const P1 = P0 * Math.pow(STRATOSPHERE_TEMP / T0, g0 / (R * T_LAPSE_RATE));
    const P2 = P1 * Math.exp(-g0 * (20000 - TROPOPAUSE_ALT) / (R * T));
    P = P2 * Math.exp(-g0 * (altitudeM - 20000) / (R * T));
  }

  const rho = P / (R * T);
  const a = Math.sqrt(GAMMA * R * T);
  // Sutherland's law for dynamic viscosity
  const mu = MU_SUTHERLAND_REF * Math.pow(T / T_SUTHERLAND_REF, 1.5) * (T_SUTHERLAND_REF + SUTHERLAND_S) / (T + SUTHERLAND_S);

  return {
    altitude: altitudeM,
    temperature: T,
    pressure: P,
    density: rho,
    speedOfSound: a,
    viscosity: mu
  };
}

export function getDensityRatio(altitudeM: number): number {
  return getISAAtmosphere(altitudeM).density / rho0;
}

export function getPressureAltitude(pressurePa: number): number {
  // Inverse ISA for troposphere
  if (pressurePa >= 22632) {
    return (T0 / T_LAPSE_RATE) * (1 - Math.pow(pressurePa / P0, (R * T_LAPSE_RATE) / g0));
  } else {
    const P1 = P0 * Math.pow(STRATOSPHERE_TEMP / T0, g0 / (R * T_LAPSE_RATE));
    return TROPOPAUSE_ALT - (R * STRATOSPHERE_TEMP / g0) * Math.log(pressurePa / P1);
  }
}

// Mach number utilities
export function tasToMach(tas: number, altitudeM: number): number {
  return tas / getISAAtmosphere(altitudeM).speedOfSound;
}

export function machToTas(mach: number, altitudeM: number): number {
  return mach * getISAAtmosphere(altitudeM).speedOfSound;
}

// Equivalent Airspeed (EAS) and Calibrated (CAS) approximations
export function tasToEas(tas: number, altitudeM: number): number {
  return tas * Math.sqrt(getISAAtmosphere(altitudeM).density / rho0);
}

export function tasToCas(tas: number, altitudeM: number): number {
  // Simplified CAS ≈ EAS for low Mach, with compressibility correction
  const eas = tasToEas(tas, altitudeM);
  const mach = tasToMach(tas, altitudeM);
  if (mach < 0.3) return eas;
  // compressibility correction factor
  return eas * (1 + 0.2 * mach * mach);
}
