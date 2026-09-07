/**
 * FlightSim Module 8 - Aircraft Specs Models
 * Core interfaces for aerodynamic and mass properties
 */

export type AircraftCategory = 'GA_SINGLE' | 'GA_TWIN' | 'TURBOPROP' | 'BUSINESS_JET' | 'REGIONAL_JET' | 'NARROW_BODY' | 'WIDE_BODY' | 'SUPERSONIC' | 'MILITARY' | 'GLIDER';
export type EngineType = 'PISTON' | 'TURBOPROP' | 'TURBOFAN' | 'TURBOJET' | 'ELECTRIC';

export interface WingGeometry {
  span: number;          // m
  area: number;          // m²
  aspectRatio: number;   // -
  meanChord: number;     // m
  sweepDeg: number;      // degrees
  dihedralDeg: number;   // degrees
  incidenceDeg: number;
  taperRatio: number;
  rootChord: number;
}

export interface AeroCoefficients {
  // Lift curve
  CL0: number;            // zero-alpha lift
  CL_alpha: number;       // per radian
  CL_max: number;         // stall
  CL_max_flaps: number;   // with full flaps
  alpha_stall_deg: number;

  // Drag polar: CD = CD0 + k*CL²
  CD0: number;            // parasite drag clean
  CD0_gear: number;       // additional with gear down
  CD0_flaps: number;      // additional with full flaps
  e_oswald: number;       // Oswald efficiency
  k_induced: number;      // induced drag factor = 1/(pi*AR*e) precomputed
}

export interface ControlSurfaces {
  elevatorEffectiveness: number; // Cl per deg
  aileronEffectiveness: number;
  rudderEffectiveness: number;
  elevatorMaxDeg: number;
  aileronMaxDeg: number;
  rudderMaxDeg: number;
}

export interface EngineSpecs {
  type: EngineType;
  count: number;
  maxThrustPerEngine_N: number; // Newtons (or equivalent for prop)
  maxPowerPerEngine_W?: number; // for piston/turboprop
  bypassRatio?: number;
  sfc: number;                  // kg/(N·s) or kg/(W·s) depending
  maxN1?: number;               // % for jets
  propDiameter_m?: number;
  propEfficiency?: number;
}

export interface MassProperties {
  emptyMass_kg: number;
  maxTakeoffMass_kg: number;
  maxLandingMass_kg: number;
  maxFuel_kg: number;
  maxPayload_kg: number;
  cgRange_m: [number, number]; // forward, aft from datum
  inertia: {
    Ixx: number; // kg·m²
    Iyy: number;
    Izz: number;
  };
}

export interface LandingGear {
  type: 'FIXED' | 'RETRACTABLE';
  dragCoefficient: number;
  wheelbase: number;
  track: number;
}

export interface AircraftSpecs {
  id: string;                 // e.g. "B738"
  icaoCode: string;           // ICAO type
  name: string;               // Full name
  manufacturer: string;
  category: AircraftCategory;
  firstFlightYear: number;
  wing: WingGeometry;
  aero: AeroCoefficients;
  controls: ControlSurfaces;
  engine: EngineSpecs;
  mass: MassProperties;
  gear: LandingGear;
  // Performance hints
  cruiseMach: number;
  cruiseAlt_ft: number;
  maxOperatingAlt_ft: number;
  vSpeeds: {
    Vs0_kts: number; // stall landing config
    Vs1_kts: number; // stall clean
    Vfe_kts: number; // max flap extended
    Vle_kts: number; // max gear extended
    Vno_kts: number; // max structural cruising
    Vne_kts: number; // never exceed
    Vr_kts: number;  // rotation
    Vx_kts: number;  // best angle
    Vy_kts: number;  // best rate
  };
}
