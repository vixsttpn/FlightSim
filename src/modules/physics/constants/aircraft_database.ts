/**
 * FlightSim Module 8 - Aircraft Database
 * 10 detailed aircraft with real-world approximations
 */

import { AircraftSpecs } from '../models/aircraft_specs';

function wingAspect(span: number, area: number) {
  return (span * span) / area;
}

export const AIRCRAFT_DATABASE: Record<string, AircraftSpecs> = {
  // 1. Cessna 172S Skyhawk - textbook GA
  C172: {
    id: 'C172',
    icaoCode: 'C172',
    name: 'Skyhawk 172S',
    manufacturer: 'Cessna',
    category: 'GA_SINGLE',
    firstFlightYear: 1955,
    wing: {
      span: 11.0,
      area: 16.2,
      aspectRatio: wingAspect(11.0, 16.2),
      meanChord: 1.47,
      sweepDeg: 0,
      dihedralDeg: 1.5,
      incidenceDeg: 2,
      taperRatio: 0.7,
      rootChord: 1.65
    },
    aero: {
      CL0: 0.25,
      CL_alpha: 5.2,
      CL_max: 1.5,
      CL_max_flaps: 2.0,
      alpha_stall_deg: 16,
      CD0: 0.027,
      CD0_gear: 0.004,
      CD0_flaps: 0.015,
      e_oswald: 0.75,
      k_induced: 1 / (Math.PI * wingAspect(11.0, 16.2) * 0.75)
    },
    controls: {
      elevatorEffectiveness: 0.45,
      aileronEffectiveness: 0.25,
      rudderEffectiveness: 0.18,
      elevatorMaxDeg: 25,
      aileronMaxDeg: 20,
      rudderMaxDeg: 30
    },
    engine: {
      type: 'PISTON',
      count: 1,
      maxThrustPerEngine_N: 3100,
      maxPowerPerEngine_W: 134000, // 180 hp
      sfc: 7.5e-8,
      propDiameter_m: 1.93,
      propEfficiency: 0.82
    },
    mass: {
      emptyMass_kg: 767,
      maxTakeoffMass_kg: 1157,
      maxLandingMass_kg: 1157,
      maxFuel_kg: 159,
      maxPayload_kg: 390,
      cgRange_m: [0.15, 0.35],
      inertia: { Ixx: 1800, Iyy: 2500, Izz: 4000 }
    },
    gear: { type: 'FIXED', dragCoefficient: 0.004, wheelbase: 2.1, track: 2.76 },
    cruiseMach: 0.18,
    cruiseAlt_ft: 8000,
    maxOperatingAlt_ft: 14000,
    vSpeeds: {
      Vs0_kts: 40, Vs1_kts: 48, Vfe_kts: 85, Vle_kts: 160,
      Vno_kts: 128, Vne_kts: 163, Vr_kts: 55, Vx_kts: 62, Vy_kts: 74
    }
  },

  // 2. Piper PA-28-181 Archer III
  PA28: {
    id: 'PA28',
    icaoCode: 'P28A',
    name: 'Archer III',
    manufacturer: 'Piper',
    category: 'GA_SINGLE',
    firstFlightYear: 1960,
    wing: {
      span: 10.7,
      area: 15.8,
      aspectRatio: wingAspect(10.7, 15.8),
      meanChord: 1.48,
      sweepDeg: 0,
      dihedralDeg: 3,
      incidenceDeg: 2,
      taperRatio: 0.62,
      rootChord: 1.7
    },
    aero: {
      CL0: 0.3,
      CL_alpha: 5.0,
      CL_max: 1.55,
      CL_max_flaps: 2.1,
      alpha_stall_deg: 15,
      CD0: 0.028,
      CD0_gear: 0.0035,
      CD0_flaps: 0.016,
      e_oswald: 0.74,
      k_induced: 1 / (Math.PI * wingAspect(10.7, 15.8) * 0.74)
    },
    controls: {
      elevatorEffectiveness: 0.42,
      aileronEffectiveness: 0.27,
      rudderEffectiveness: 0.19,
      elevatorMaxDeg: 28,
      aileronMaxDeg: 22,
      rudderMaxDeg: 32
    },
    engine: {
      type: 'PISTON',
      count: 1,
      maxThrustPerEngine_N: 3200,
      maxPowerPerEngine_W: 134000,
      sfc: 7.6e-8,
      propDiameter_m: 1.88,
      propEfficiency: 0.81
    },
    mass: {
      emptyMass_kg: 781,
      maxTakeoffMass_kg: 1157,
      maxLandingMass_kg: 1157,
      maxFuel_kg: 183,
      maxPayload_kg: 376,
      cgRange_m: [0.18, 0.38],
      inertia: { Ixx: 1900, Iyy: 2600, Izz: 4200 }
    },
    gear: { type: 'FIXED', dragCoefficient: 0.0035, wheelbase: 1.9, track: 3.0 },
    cruiseMach: 0.19,
    cruiseAlt_ft: 8000,
    maxOperatingAlt_ft: 14000,
    vSpeeds: {
      Vs0_kts: 44, Vs1_kts: 50, Vfe_kts: 102, Vle_kts: 160,
      Vno_kts: 126, Vne_kts: 171, Vr_kts: 59, Vx_kts: 64, Vy_kts: 76
    }
  },

  // 3. Cirrus SR22 G6
  SR22: {
    id: 'SR22',
    icaoCode: 'SR22',
    name: 'SR22 G6',
    manufacturer: 'Cirrus',
    category: 'GA_SINGLE',
    firstFlightYear: 2001,
    wing: {
      span: 11.68,
      area: 13.71,
      aspectRatio: wingAspect(11.68, 13.71),
      meanChord: 1.17,
      sweepDeg: 0,
      dihedralDeg: 2,
      incidenceDeg: 2.5,
      taperRatio: 0.45,
      rootChord: 1.55
    },
    aero: {
      CL0: 0.22,
      CL_alpha: 5.6,
      CL_max: 1.6,
      CL_max_flaps: 2.2,
      alpha_stall_deg: 15,
      CD0: 0.022,
      CD0_gear: 0.003,
      CD0_flaps: 0.018,
      e_oswald: 0.82,
      k_induced: 1 / (Math.PI * wingAspect(11.68, 13.71) * 0.82)
    },
    controls: {
      elevatorEffectiveness: 0.48,
      aileronEffectiveness: 0.30,
      rudderEffectiveness: 0.20,
      elevatorMaxDeg: 20,
      aileronMaxDeg: 18,
      rudderMaxDeg: 25
    },
    engine: {
      type: 'PISTON',
      count: 1,
      maxThrustPerEngine_N: 5200,
      maxPowerPerEngine_W: 231000, // 310 hp
      sfc: 7.3e-8,
      propDiameter_m: 1.98,
      propEfficiency: 0.84
    },
    mass: {
      emptyMass_kg: 1009,
      maxTakeoffMass_kg: 1633,
      maxLandingMass_kg: 1633,
      maxFuel_kg: 272,
      maxPayload_kg: 624,
      cgRange_m: [0.2, 0.4],
      inertia: { Ixx: 2100, Iyy: 3000, Izz: 4800 }
    },
    gear: { type: 'FIXED', dragCoefficient: 0.003, wheelbase: 2.0, track: 2.8 },
    cruiseMach: 0.26,
    cruiseAlt_ft: 10000,
    maxOperatingAlt_ft: 17500,
    vSpeeds: {
      Vs0_kts: 60, Vs1_kts: 69, Vfe_kts: 119, Vle_kts: 200,
      Vno_kts: 177, Vne_kts: 200, Vr_kts: 71, Vx_kts: 83, Vy_kts: 101
    }
  },

  // 4. Daher TBM 930
  TBM9: {
    id: 'TBM9',
    icaoCode: 'TBM9',
    name: 'TBM 930',
    manufacturer: 'Daher',
    category: 'TURBOPROP',
    firstFlightYear: 2016,
    wing: {
      span: 12.83,
      area: 18.0,
      aspectRatio: wingAspect(12.83, 18.0),
      meanChord: 1.4,
      sweepDeg: 2,
      dihedralDeg: 4,
      incidenceDeg: 2,
      taperRatio: 0.5,
      rootChord: 1.9
    },
    aero: {
      CL0: 0.28,
      CL_alpha: 5.4,
      CL_max: 1.7,
      CL_max_flaps: 2.4,
      alpha_stall_deg: 16,
      CD0: 0.021,
      CD0_gear: 0.012,
      CD0_flaps: 0.025,
      e_oswald: 0.80,
      k_induced: 1 / (Math.PI * wingAspect(12.83, 18.0) * 0.80)
    },
    controls: {
      elevatorEffectiveness: 0.55,
      aileronEffectiveness: 0.35,
      rudderEffectiveness: 0.25,
      elevatorMaxDeg: 22,
      aileronMaxDeg: 20,
      rudderMaxDeg: 30
    },
    engine: {
      type: 'TURBOPROP',
      count: 1,
      maxThrustPerEngine_N: 8900,
      maxPowerPerEngine_W: 630000,
      sfc: 8.0e-8,
      propDiameter_m: 2.1,
      propEfficiency: 0.85
    },
    mass: {
      emptyMass_kg: 2097,
      maxTakeoffMass_kg: 3354,
      maxLandingMass_kg: 3186,
      maxFuel_kg: 1100,
      maxPayload_kg: 644,
      cgRange_m: [0.22, 0.42],
      inertia: { Ixx: 4500, Iyy: 8000, Izz: 11000 }
    },
    gear: { type: 'RETRACTABLE', dragCoefficient: 0.012, wheelbase: 3.2, track: 3.5 },
    cruiseMach: 0.48,
    cruiseAlt_ft: 28000,
    maxOperatingAlt_ft: 31000,
    vSpeeds: {
      Vs0_kts: 71, Vs1_kts: 82, Vfe_kts: 142, Vle_kts: 172,
      Vno_kts: 223, Vne_kts: 271, Vr_kts: 90, Vx_kts: 100, Vy_kts: 115
    }
  },

  // 5. Beechcraft King Air 350i
  BE35: {
    id: 'BE35',
    icaoCode: 'B350',
    name: 'King Air 350i',
    manufacturer: 'Beechcraft',
    category: 'TURBOPROP',
    firstFlightYear: 2009,
    wing: {
      span: 17.65,
      area: 28.8,
      aspectRatio: wingAspect(17.65, 28.8),
      meanChord: 1.63,
      sweepDeg: 0,
      dihedralDeg: 4,
      incidenceDeg: 3,
      taperRatio: 0.55,
      rootChord: 2.2
    },
    aero: {
      CL0: 0.32,
      CL_alpha: 5.3,
      CL_max: 1.8,
      CL_max_flaps: 2.5,
      alpha_stall_deg: 16,
      CD0: 0.024,
      CD0_gear: 0.015,
      CD0_flaps: 0.030,
      e_oswald: 0.78,
      k_induced: 1 / (Math.PI * wingAspect(17.65, 28.8) * 0.78)
    },
    controls: {
      elevatorEffectiveness: 0.50,
      aileronEffectiveness: 0.28,
      rudderEffectiveness: 0.22,
      elevatorMaxDeg: 25,
      aileronMaxDeg: 22,
      rudderMaxDeg: 30
    },
    engine: {
      type: 'TURBOPROP',
      count: 2,
      maxThrustPerEngine_N: 6500,
      maxPowerPerEngine_W: 783000,
      sfc: 9.0e-8,
      propDiameter_m: 2.69,
      propEfficiency: 0.82
    },
    mass: {
      emptyMass_kg: 4166,
      maxTakeoffMass_kg: 6804,
      maxLandingMass_kg: 6466,
      maxFuel_kg: 1890,
      maxPayload_kg: 1100,
      cgRange_m: [0.2, 0.45],
      inertia: { Ixx: 12000, Iyy: 25000, Izz: 34000 }
    },
    gear: { type: 'RETRACTABLE', dragCoefficient: 0.015, wheelbase: 4.5, track: 5.3 },
    cruiseMach: 0.44,
    cruiseAlt_ft: 25000,
    maxOperatingAlt_ft: 35000,
    vSpeeds: {
      Vs0_kts: 75, Vs1_kts: 89, Vfe_kts: 151, Vle_kts: 181,
      Vno_kts: 212, Vne_kts: 260, Vr_kts: 95, Vx_kts: 108, Vy_kts: 121
    }
  },

  // 6. Embraer Phenom 300E
  E55P: {
    id: 'E55P',
    icaoCode: 'E55P',
    name: 'Phenom 300E',
    manufacturer: 'Embraer',
    category: 'BUSINESS_JET',
    firstFlightYear: 2008,
    wing: {
      span: 16.39,
      area: 29.0,
      aspectRatio: wingAspect(16.39, 29.0),
      meanChord: 1.77,
      sweepDeg: 17,
      dihedralDeg: 3,
      incidenceDeg: 2,
      taperRatio: 0.35,
      rootChord: 2.7
    },
    aero: {
      CL0: 0.28,
      CL_alpha: 5.7,
      CL_max: 1.6,
      CL_max_flaps: 2.3,
      alpha_stall_deg: 14,
      CD0: 0.018,
      CD0_gear: 0.014,
      CD0_flaps: 0.028,
      e_oswald: 0.81,
      k_induced: 1 / (Math.PI * wingAspect(16.39, 29.0) * 0.81)
    },
    controls: {
      elevatorEffectiveness: 0.60,
      aileronEffectiveness: 0.38,
      rudderEffectiveness: 0.28,
      elevatorMaxDeg: 20,
      aileronMaxDeg: 22,
      rudderMaxDeg: 30
    },
    engine: {
      type: 'TURBOFAN',
      count: 2,
      maxThrustPerEngine_N: 14940,
      bypassRatio: 4.1,
      sfc: 1.05e-5
    },
    mass: {
      emptyMass_kg: 5148,
      maxTakeoffMass_kg: 8150,
      maxLandingMass_kg: 7148,
      maxFuel_kg: 2391,
      maxPayload_kg: 1020,
      cgRange_m: [0.18, 0.38],
      inertia: { Ixx: 18000, Iyy: 45000, Izz: 58000 }
    },
    gear: { type: 'RETRACTABLE', dragCoefficient: 0.014, wheelbase: 5.9, track: 3.8 },
    cruiseMach: 0.78,
    cruiseAlt_ft: 41000,
    maxOperatingAlt_ft: 45000,
    vSpeeds: {
      Vs0_kts: 90, Vs1_kts: 103, Vfe_kts: 160, Vle_kts: 200,
      Vno_kts: 270, Vne_kts: 320, Vr_kts: 110, Vx_kts: 140, Vy_kts: 160
    }
  },

  // 7. Airbus A320-200
  A320: {
    id: 'A320',
    icaoCode: 'A320',
    name: 'A320-200',
    manufacturer: 'Airbus',
    category: 'NARROW_BODY',
    firstFlightYear: 1987,
    wing: {
      span: 34.1,
      area: 122.6,
      aspectRatio: wingAspect(34.1, 122.6),
      meanChord: 3.9,
      sweepDeg: 25,
      dihedralDeg: 5,
      incidenceDeg: 2,
      taperRatio: 0.24,
      rootChord: 6.4
    },
    aero: {
      CL0: 0.4,
      CL_alpha: 5.9,
      CL_max: 1.65,
      CL_max_flaps: 2.6,
      alpha_stall_deg: 15,
      CD0: 0.0185,
      CD0_gear: 0.015,
      CD0_flaps: 0.045,
      e_oswald: 0.80,
      k_induced: 1 / (Math.PI * wingAspect(34.1, 122.6) * 0.80)
    },
    controls: {
      elevatorEffectiveness: 0.65,
      aileronEffectiveness: 0.40,
      rudderEffectiveness: 0.30,
      elevatorMaxDeg: 30,
      aileronMaxDeg: 25,
      rudderMaxDeg: 30
    },
    engine: {
      type: 'TURBOFAN',
      count: 2,
      maxThrustPerEngine_N: 120100, // CFM56-5B4
      bypassRatio: 5.4,
      sfc: 1.02e-5
    },
    mass: {
      emptyMass_kg: 41244,
      maxTakeoffMass_kg: 78000,
      maxLandingMass_kg: 66000,
      maxFuel_kg: 18728,
      maxPayload_kg: 16400,
      cgRange_m: [15, 18.5],
      inertia: { Ixx: 800000, Iyy: 3500000, Izz: 4200000 }
    },
    gear: { type: 'RETRACTABLE', dragCoefficient: 0.015, wheelbase: 12.6, track: 7.5 },
    cruiseMach: 0.78,
    cruiseAlt_ft: 35000,
    maxOperatingAlt_ft: 39800,
    vSpeeds: {
      Vs0_kts: 112, Vs1_kts: 132, Vfe_kts: 200, Vle_kts: 250,
      Vno_kts: 340, Vne_kts: 380, Vr_kts: 142, Vx_kts: 170, Vy_kts: 250
    }
  },

  // 8. Boeing 737-800
  B738: {
    id: 'B738',
    icaoCode: 'B738',
    name: '737-800',
    manufacturer: 'Boeing',
    category: 'NARROW_BODY',
    firstFlightYear: 1997,
    wing: {
      span: 35.79,
      area: 124.6,
      aspectRatio: wingAspect(35.79, 124.6),
      meanChord: 3.48,
      sweepDeg: 25,
      dihedralDeg: 6,
      incidenceDeg: 2,
      taperRatio: 0.26,
      rootChord: 6.0
    },
    aero: {
      CL0: 0.42,
      CL_alpha: 5.8,
      CL_max: 1.68,
      CL_max_flaps: 2.65,
      alpha_stall_deg: 15,
      CD0: 0.019,
      CD0_gear: 0.016,
      CD0_flaps: 0.048,
      e_oswald: 0.79,
      k_induced: 1 / (Math.PI * wingAspect(35.79, 124.6) * 0.79)
    },
    controls: {
      elevatorEffectiveness: 0.68,
      aileronEffectiveness: 0.42,
      rudderEffectiveness: 0.32,
      elevatorMaxDeg: 28,
      aileronMaxDeg: 25,
      rudderMaxDeg: 27
    },
    engine: {
      type: 'TURBOFAN',
      count: 2,
      maxThrustPerEngine_N: 121400, // CFM56-7B26
      bypassRatio: 5.1,
      sfc: 1.03e-5
    },
    mass: {
      emptyMass_kg: 41413,
      maxTakeoffMass_kg: 79010,
      maxLandingMass_kg: 66360,
      maxFuel_kg: 20707,
      maxPayload_kg: 20540,
      cgRange_m: [13.5, 18.0],
      inertia: { Ixx: 850000, Iyy: 3800000, Izz: 4400000 }
    },
    gear: { type: 'RETRACTABLE', dragCoefficient: 0.016, wheelbase: 12.1, track: 5.7 },
    cruiseMach: 0.785,
    cruiseAlt_ft: 35000,
    maxOperatingAlt_ft: 41000,
    vSpeeds: {
      Vs0_kts: 115, Vs1_kts: 135, Vfe_kts: 205, Vle_kts: 270,
      Vno_kts: 340, Vne_kts: 400, Vr_kts: 145, Vx_kts: 175, Vy_kts: 270
    }
  },

  // 9. Boeing 747-400
  B744: {
    id: 'B744',
    icaoCode: 'B744',
    name: '747-400',
    manufacturer: 'Boeing',
    category: 'WIDE_BODY',
    firstFlightYear: 1988,
    wing: {
      span: 64.44,
      area: 541.2,
      aspectRatio: wingAspect(64.44, 541.2),
      meanChord: 8.4,
      sweepDeg: 37.5,
      dihedralDeg: 6,
      incidenceDeg: 2,
      taperRatio: 0.28,
      rootChord: 13.6
    },
    aero: {
      CL0: 0.45,
      CL_alpha: 5.5,
      CL_max: 1.55,
      CL_max_flaps: 2.5,
      alpha_stall_deg: 14,
      CD0: 0.017,
      CD0_gear: 0.012,
      CD0_flaps: 0.055,
      e_oswald: 0.82,
      k_induced: 1 / (Math.PI * wingAspect(64.44, 541.2) * 0.82)
    },
    controls: {
      elevatorEffectiveness: 0.75,
      aileronEffectiveness: 0.45,
      rudderEffectiveness: 0.35,
      elevatorMaxDeg: 25,
      aileronMaxDeg: 20,
      rudderMaxDeg: 25
    },
    engine: {
      type: 'TURBOFAN',
      count: 4,
      maxThrustPerEngine_N: 264600, // PW4062 / CF6
      bypassRatio: 5.0,
      sfc: 1.0e-5
    },
    mass: {
      emptyMass_kg: 183890,
      maxTakeoffMass_kg: 397000,
      maxLandingMass_kg: 295000,
      maxFuel_kg: 183380,
      maxPayload_kg: 68000,
      cgRange_m: [23, 27.5],
      inertia: { Ixx: 15000000, Iyy: 70000000, Izz: 80000000 }
    },
    gear: { type: 'RETRACTABLE', dragCoefficient: 0.012, wheelbase: 25.6, track: 11.0 },
    cruiseMach: 0.855,
    cruiseAlt_ft: 35000,
    maxOperatingAlt_ft: 45000,
    vSpeeds: {
      Vs0_kts: 135, Vs1_kts: 155, Vfe_kts: 220, Vle_kts: 270,
      Vno_kts: 340, Vne_kts: 400, Vr_kts: 165, Vx_kts: 195, Vy_kts: 290
    }
  },

  // 10. Concorde - supersonic legend
  CONC: {
    id: 'CONC',
    icaoCode: 'CONC',
    name: 'Concorde',
    manufacturer: 'Aérospatiale / BAC',
    category: 'SUPERSONIC',
    firstFlightYear: 1969,
    wing: {
      span: 25.6,
      area: 358.25,
      aspectRatio: wingAspect(25.6, 358.25),
      meanChord: 14,
      sweepDeg: 60, // ogival delta average
      dihedralDeg: 0,
      incidenceDeg: 0,
      taperRatio: 0.05,
      rootChord: 27,
      // Delta wing specifics handled in aero model
    } as any,
    aero: {
      CL0: 0.1,
      CL_alpha: 3.2, // lower for delta
      CL_max: 1.0,
      CL_max_flaps: 1.0, // no flaps, droop nose
      alpha_stall_deg: 25, // high AoA for delta
      CD0: 0.015,
      CD0_gear: 0.018,
      CD0_flaps: 0,
      e_oswald: 0.70,
      k_induced: 1 / (Math.PI * wingAspect(25.6, 358.25) * 0.70)
    },
    controls: {
      elevatorEffectiveness: 0.90, // elevons
      aileronEffectiveness: 0.50,
      rudderEffectiveness: 0.28,
      elevatorMaxDeg: 20,
      aileronMaxDeg: 18,
      rudderMaxDeg: 25
    },
    engine: {
      type: 'TURBOJET',
      count: 4,
      maxThrustPerEngine_N: 169000, // Olympus 593 with reheat
      bypassRatio: 0,
      sfc: 3.2e-5 // high with afterburner
    },
    mass: {
      emptyMass_kg: 78700,
      maxTakeoffMass_kg: 185070,
      maxLandingMass_kg: 111130,
      maxFuel_kg: 95680,
      maxPayload_kg: 11700,
      cgRange_m: [20, 26],
      inertia: { Ixx: 5000000, Iyy: 35000000, Izz: 39000000 }
    },
    gear: { type: 'RETRACTABLE', dragCoefficient: 0.018, wheelbase: 18.6, track: 7.7 },
    cruiseMach: 2.02,
    cruiseAlt_ft: 60000,
    maxOperatingAlt_ft: 60000,
    vSpeeds: {
      Vs0_kts: 150, Vs1_kts: 185, Vfe_kts: 250, Vle_kts: 280,
      Vno_kts: 400, Vne_kts: 530, Vr_kts: 198, Vx_kts: 220, Vy_kts: 320
    }
  }
};

export const AIRCRAFT_IDS = Object.keys(AIRCRAFT_DATABASE);

export function getAircraftById(id: string): AircraftSpecs | undefined {
  return AIRCRAFT_DATABASE[id.toUpperCase()];
}

export function getAircraftList(): AircraftSpecs[] {
  return Object.values(AIRCRAFT_DATABASE);
}

export function searchAircraftByCategory(category: string): AircraftSpecs[] {
  return getAircraftList().filter(a => a.category === category);
}
