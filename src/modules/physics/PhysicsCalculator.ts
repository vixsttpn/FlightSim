/**
 * FlightSim - Physics Kernel 9
 * PhysicsCalculator.ts
 * Полная аэродинамическая модель: L = 0.5 * rho * V^2 * S * CL
 * Включает ISA атмосферу, CL/CD полярy, тягу, вес, моменты, интеграцию состояния.
 */

export interface Vec3 {
  x: number; // forward / north / roll axis
  y: number; // lateral / east / pitch
  z: number; // vertical / down / yaw - NED convention for forces, but attitude uses Euler
}

export interface GeoPosition {
  lat: number; // deg
  lon: number; // deg
  altM: number; // MSL meters
  altAGL_M?: number; // AGL meters
}

export interface Attitude {
  pitchDeg: number; // Theta
  rollDeg: number;  // Phi
  yawDeg: number;   // Psi / Heading
}

export interface Velocity {
  tasMS: number; // True Airspeed
  iasMS: number; // Indicated
  gsMS: number;  // Ground speed
  vsMS: number;  // vertical speed m/s (+ up)
  mach: number;
  headingDeg: number;
  trackDeg: number;
}

export interface AngularVelocity {
  p: number; // roll rate rad/s
  q: number; // pitch rate rad/s
  r: number; // yaw rate rad/s
}

export interface AircraftConfig {
  /** Wing reference area m^2 */
  wingAreaM2: number;
  /** Wing span m */
  wingSpanM: number;
  /** Mean aerodynamic chord m */
  macM: number;
  /** Empty mass kg */
  emptyMassKg: number;
  /** Max takeoff mass kg */
  maxMassKg: number;
  /** Moment of inertia kg*m^2 */
  inertia: Vec3;
  /** Aerodynamics */
  aero: {
    CL0: number;
    CL_alpha: number; // per rad
    CL_max: number;
    CD0: number;
    k_induced: number; // 1/(pi*AR*e)
    CL_flap_factor: number; // delta CL per flap deg
    CD_flap_factor: number; // delta CD per flap deg
    CD_gear: number;
    CM0: number;
    CM_alpha: number; // per rad
    CM_q: number;
    CL_de: number; // elevator effectiveness
    CY_b: number; // side force due to sideslip
    Cl_p: number; Cn_r: number;
  };
  engine: {
    maxThrustN: number; // per engine * num engines aggregated? total
    numEngines: number;
    tsfc: number; // kg/(N*s) - thrust specific fuel consumption
    thrustLapseK: number; // thrust lapse with altitude
  };
}

export interface ControlSurfaces {
  elevator: number; // -1..1
  aileron: number; // -1..1
  rudder: number; // -1..1
  flapsDeg: number; // 0..40
  gearDown: boolean;
  speedbrake: number; // 0..1
  throttle: number; // 0..1
}

export interface AircraftState {
  pos: GeoPosition;
  attitude: Attitude;
  vel: Velocity;
  angVel: AngularVelocity;
  acc: Vec3; // m/s^2 body frame
  massKg: number;
  fuelKg: number;
  aoaDeg: number;
  sideslipDeg: number;
  dynamicPressurePa: number;
  liftN: number;
  dragN: number;
  thrustN: number;
  weightN: number;
  loadFactor: number;
  stall: boolean;
  onGround: boolean;
  timeS: number;
}

export interface Atmosphere {
  rho: number; // kg/m3
  pressurePa: number;
  tempK: number;
  soundSpeedMS: number;
  pressureRatio: number;
  densityRatio: number;
}

export const SEA_LEVEL = {
  rho0: 1.225, // kg/m3
  P0: 101325, // Pa
  T0: 288.15, // K
  L: 0.0065, // K/m lapse rate troposphere
  R: 287.05287, // J/(kg*K)
  g0: 9.80665,
  gamma: 1.4,
};

export class PhysicsCalculator {
  config: AircraftConfig;

  constructor(config: AircraftConfig) {
    this.config = config;
  }

  /** ISA Atmosphere model up to 20km */
  static getAtmosphere(altM: number): Atmosphere {
    const { rho0, P0, T0, L, R, g0, gamma } = SEA_LEVEL;
    let T: number, P: number, rho: number;
    const h = Math.max(0, Math.min(altM, 20000));
    if (h < 11000) {
      T = T0 - L * h;
      P = P0 * Math.pow(T / T0, g0 / (L * R));
    } else {
      // Lower stratosphere, isothermal
      const T11 = T0 - L * 11000;
      const P11 = P0 * Math.pow(T11 / T0, g0 / (L * R));
      T = T11;
      P = P11 * Math.exp(-g0 * (h - 11000) / (R * T));
    }
    rho = P / (R * T);
    const soundSpeed = Math.sqrt(gamma * R * T);
    return {
      rho,
      pressurePa: P,
      tempK: T,
      soundSpeedMS: soundSpeed,
      pressureRatio: P / P0,
      densityRatio: rho / rho0,
    };
  }

  /** CL(alpha) с линейным участком + сваливание */
  computeLiftCoefficient(alphaRad: number, flapsDeg: number, groundEffectFactor: number): number {
    const { CL0, CL_alpha, CL_max, CL_flap_factor } = this.config.aero;
    let CL = CL0 + CL_alpha * alphaRad;
    // Flap increment: delta CL = factor * flaps
    CL += CL_flap_factor * (flapsDeg * Math.PI / 180);
    // Ground effect increases CL: 1 + GE
    CL *= (1 + groundEffectFactor * 0.15);
    // Stall modeling: soft clip via tanh
    const CL_limit = CL_max + CL_flap_factor * (flapsDeg * Math.PI / 180) * 0.5;
    if (CL > CL_limit) {
      const excess = CL - CL_limit;
      CL = CL_limit + Math.tanh(excess) * 0.3 - excess * 0.8; // post-stall drop
    }
    if (CL < -CL_limit * 0.6) CL = -CL_limit * 0.6;
    return CL;
  }

  computeDragCoefficient(CL: number, flapsDeg: number, gearDown: boolean, speedbrake: number): number {
    const { CD0, k_induced, CD_flap_factor, CD_gear } = this.config.aero;
    let CD = CD0 + k_induced * CL * CL;
    CD += CD_flap_factor * (flapsDeg * Math.PI / 180);
    if (gearDown) CD += CD_gear;
    CD += speedbrake * 0.15; // speedbrake drag
    return Math.max(0.015, CD);
  }

  /** Dynamic pressure q = 0.5 * rho * V^2 */
  static dynamicPressure(rho: number, tas: number): number {
    return 0.5 * rho * tas * tas;
  }

  /** L = 0.5 * rho * V^2 * S * CL = q * S * CL */
  static lift(q: number, S: number, CL: number): number {
    return q * S * CL;
  }

  /** D = q * S * CD */
  static drag(q: number, S: number, CD: number): number {
    return q * S * CD;
  }

  /** Thrust model: T = throttle * Tmax * (rho/rho0)^lapse * (1 - 0.2*M) */
  computeThrust(throttle: number, atm: Atmosphere, mach: number): number {
    const { maxThrustN, thrustLapseK } = this.config.engine;
    const densityFactor = Math.pow(atm.densityRatio, thrustLapseK);
    const ramFactor = Math.max(0.2, 1 - 0.15 * mach);
    return throttle * maxThrustN * densityFactor * ramFactor;
  }

  /** Stall speed: Vs = sqrt(2*W / (rho * S * CLmax)) */
  stallSpeed(massKg: number, atm: Atmosphere, flapsDeg: number): number {
    const W = massKg * SEA_LEVEL.g0;
    const CLmax = this.config.aero.CL_max + this.config.aero.CL_flap_factor * (flapsDeg * Math.PI / 180) * 0.5;
    return Math.sqrt((2 * W) / (atm.rho * this.config.wingAreaM2 * CLmax));
  }

  /** Ground effect factor: 0..1 based on h / b */
  static groundEffectFactor(aglM: number, wingSpanM: number): number {
    if (aglM > wingSpanM) return 0;
    if (aglM <= 0) return 1;
    // Approximation: GE = 1 - (h/b) -> 0..1 inverted for benefit; return 1 - (h/b)
    const hb = aglM / wingSpanM;
    return Math.pow(1 - hb, 1.5);
  }

  /** Основная физика: входы -> силы, ускорения, новая скорость и позиция (простая интеграция) */
  updateState(prev: AircraftState, controls: ControlSurfaces, dtS: number, wind: Vec3 = { x: 0, y: 0, z: 0 }): AircraftState {
    const atm = PhysicsCalculator.getAtmosphere(prev.pos.altM);
    const tas = Math.max(0.1, prev.vel.tasMS);
    const q = PhysicsCalculator.dynamicPressure(atm.rho, tas);
    const agl = prev.pos.altAGL_M ?? prev.pos.altM;
    const ge = PhysicsCalculator.groundEffectFactor(agl, this.config.wingSpanM);

    const alphaRad = (prev.aoaDeg * Math.PI) / 180;
    const CL = this.computeLiftCoefficient(alphaRad, controls.flapsDeg, ge);
    const CD = this.computeDragCoefficient(CL, controls.flapsDeg, controls.gearDown, controls.speedbrake);

    const lift = PhysicsCalculator.lift(q, this.config.wingAreaM2, CL);
    const drag = PhysicsCalculator.drag(q, this.config.wingAreaM2, CD);
    const mach = tas / atm.soundSpeedMS;
    const thrust = this.computeThrust(controls.throttle, atm, mach);

    const weightN = prev.massKg * SEA_LEVEL.g0;
    const stallVs = this.stallSpeed(prev.massKg, atm, controls.flapsDeg);
    const isStall = tas < stallVs * 1.05 && !prev.onGround;

    // Аэродинамические силы в wind frame, переводим в body (упрощенно)
    // Подъемная сила направлена вверх, сопротивление назад, тяга вперед
    // Разложим с учетом AoA
    const cosAoA = Math.cos(alphaRad);
    const sinAoA = Math.sin(alphaRad);

    // Body X: forward, Z: down
    // L rotates by AoA
    const Fx_aero = -drag * cosAoA + lift * sinAoA;
    const Fz_aero = -lift * cosAoA - drag * sinAoA;

    const Fx_thrust = thrust;
    const Fz_weight = weightN; // в NED Z down positive, but в body approx

    // Управляющие моменты (упрощенная модель)
    const { elevator, aileron, rudder } = controls;
    const { CM0, CM_alpha, CM_q, CL_de } = this.config.aero;

    // Pitch moment: Cm = Cm0 + Cm_alpha*alpha + Cm_q * q * c / (2*V) + Cm_e * elevator
    const qBar = (prev.angVel.q * this.config.macM) / (2 * Math.max(tas, 10));
    const pitchMomentCoeff = CM0 + CM_alpha * alphaRad + CM_q * qBar + CL_de * elevator;
    const pitchMoment = pitchMomentCoeff * q * this.config.wingAreaM2 * this.config.macM;

    const rollMoment = aileron * q * this.config.wingAreaM2 * this.config.wingSpanM * 0.15 + prev.angVel.p * -0.3 * q;
    const yawMoment = rudder * q * this.config.wingAreaM2 * this.config.wingSpanM * 0.12 + this.config.aero.Cn_r * prev.angVel.r * q;

    // Accelerations F=ma
    const ax = (Fx_aero + Fx_thrust) / prev.massKg;
    const az = (Fz_aero + Fz_weight) / prev.massKg; // positive down

    // Интеграция угловых скоростей
    const pDot = rollMoment / this.config.inertia.x;
    const qDot = pitchMoment / this.config.inertia.y;
    const rDot = yawMoment / this.config.inertia.z;

    const newAngVel: AngularVelocity = {
      p: prev.angVel.p + pDot * dtS,
      q: prev.angVel.q + qDot * dtS,
      r: prev.angVel.r + rDot * dtS,
    };

    // Демпфирование угловых скоростей
    newAngVel.p *= 0.995;
    newAngVel.q *= 0.995;
    newAngVel.r *= 0.995;

    // Интеграция Эйлера для attitude
    const rollRad = (prev.attitude.rollDeg * Math.PI) / 180;
    const pitchRad = (prev.attitude.pitchDeg * Math.PI) / 180;
    // Кватернионная кинематика упрощенно: Euler rates approx body rates
    const dRoll = (newAngVel.p + Math.sin(rollRad) * Math.tan(pitchRad) * newAngVel.q + Math.cos(rollRad) * Math.tan(pitchRad) * newAngVel.r) * dtS;
    const dPitch = (Math.cos(rollRad) * newAngVel.q - Math.sin(rollRad) * newAngVel.r) * dtS;
    const dYaw = (Math.sin(rollRad) / Math.cos(pitchRad) * newAngVel.q + Math.cos(rollRad) / Math.cos(pitchRad) * newAngVel.r) * dtS;

    let newRoll = rollRad + dRoll;
    let newPitch = pitchRad + dPitch;
    let newYaw = (prev.attitude.yawDeg * Math.PI / 180) + dYaw;

    // Ограничения
    const maxPitch = 25 * Math.PI / 180;
    const maxRoll = 60 * Math.PI / 180;
    newPitch = Math.max(-maxPitch, Math.min(maxPitch, newPitch));
    newRoll = Math.max(-maxRoll, Math.min(maxRoll, newRoll));

    // Линейная скорость в NED, учет ориентации (упрощенно)
    // Преобразуем body ускорения в NED через yaw и pitch
    const yawC = Math.cos(newYaw);
    const yawS = Math.sin(newYaw);
    const pitchC = Math.cos(newPitch);

    // Body forward acceleration contributes to North/East by yaw
    const axNedN = ax * pitchC * yawC;
    const axNedE = ax * pitchC * yawS;
    const axNedD = -ax * Math.sin(newPitch) + az; // down positive

    // Текущие скорости в NED из TAS и heading
    const prevTasN = tas * pitchC * yawC;
    const prevTasE = tas * pitchC * yawS;
    const prevVsUp = -axNedD; // упростим позже

    // Интеграция
    const newVelN = prevTasN + axNedN * dtS + wind.x * dtS * 0.1;
    const newVelE = prevTasE + axNedE * dtS + wind.y * dtS * 0.1;
    const newVelD = (prev.vel.vsMS ? -prev.vel.vsMS : 0) + axNedD * dtS;

    const newTas = Math.sqrt(newVelN * newVelN + newVelE * newVelE + Math.max(0, (tas * Math.sin(newPitch)) ** 2));
    const newVs = -newVelD; // up positive
    const newTrack = (Math.atan2(newVelE, newVelN) * 180) / Math.PI;
    const newHeading = (newYaw * 180) / Math.PI;

    // IAS из TAS и плотности: IAS = TAS * sqrt(rho/rho0)
    const ias = newTas * Math.sqrt(atm.densityRatio);
    const machNew = newTas / atm.soundSpeedMS;

    // Позиция: интегрируем lat/lon (приближение)
    // 1 deg lat ~ 111km, lon ~ 111km * cos(lat)
    const dNorthM = newVelN * dtS;
    const dEastM = newVelE * dtS;
    const dAltM = newVs * dtS;
    const degPerMeterLat = 1 / 111319.9;
    const degPerMeterLon = 1 / (111319.9 * Math.cos((prev.pos.lat * Math.PI) / 180));

    const newLat = prev.pos.lat + dNorthM * degPerMeterLat;
    const newLon = prev.pos.lon + dEastM * degPerMeterLon;
    const newAlt = prev.pos.altM + dAltM;

    // AoA пересчет: pitch - flight path angle
    const fpa = Math.atan2(newVs, Math.max(newTas * pitchC, 0.1)) * 180 / Math.PI;
    const newAoA = (newPitch * 180 / Math.PI) - fpa;

    // Load factor: L / W
    const loadFactor = lift / Math.max(weightN, 0.1);

    return {
      pos: {
        lat: newLat,
        lon: newLon,
        altM: newAlt,
        altAGL_M: Math.max(0, newAlt - (prev.pos.altAGL_M !== undefined ? prev.pos.altM - prev.pos.altAGL_M : 0)),
      },
      attitude: {
        pitchDeg: (newPitch * 180) / Math.PI,
        rollDeg: (newRoll * 180) / Math.PI,
        yawDeg: ((newHeading % 360) + 360) % 360,
      },
      vel: {
        tasMS: newTas,
        iasMS: ias,
        gsMS: Math.sqrt(newVelN * newVelN + newVelE * newVelE),
        vsMS: newVs,
        mach: machNew,
        headingDeg: ((newHeading % 360) + 360) % 360,
        trackDeg: ((newTrack % 360) + 360) % 360,
      },
      angVel: newAngVel,
      acc: { x: axNedN, y: axNedE, z: axNedD },
      massKg: prev.massKg,
      fuelKg: prev.fuelKg,
      aoaDeg: newAoA,
      sideslipDeg: prev.sideslipDeg * 0.95 - newAngVel.r * 2,
      dynamicPressurePa: q,
      liftN: lift,
      dragN: drag,
      thrustN: thrust,
      weightN,
      loadFactor,
      stall: isStall,
      onGround: newAlt <= 1.0 || (prev.onGround && newAlt < 2 && newVs < 0.5),
      timeS: prev.timeS + dtS,
    };
  }

  /** Полезные формулы вне класса */
  static knotsToMS(kts: number) { return kts * 0.514444; }
  static msToKnots(ms: number) { return ms / 0.514444; }
  static feetToM(ft: number) { return ft * 0.3048; }
  static mToFeet(m: number) { return m / 0.3048; }
}

/** Пресет для Boeing 737-800 подобного самолета */
export const B738_CONFIG: AircraftConfig = {
  wingAreaM2: 124.6,
  wingSpanM: 35.8,
  macM: 4.5,
  emptyMassKg: 41413,
  maxMassKg: 79010,
  inertia: { x: 1.2e6, y: 2.8e6, z: 3.2e6 },
  aero: {
    CL0: 0.2,
    CL_alpha: 5.2,
    CL_max: 1.6,
    CD0: 0.021,
    k_induced: 0.045,
    CL_flap_factor: 0.8,
    CD_flap_factor: 0.12,
    CD_gear: 0.015,
    CM0: 0.05,
    CM_alpha: -0.8,
    CM_q: -6.0,
    CL_de: -0.7,
    CY_b: -0.6,
    Cl_p: -0.4,
    Cn_r: -0.25,
  },
  engine: {
    maxThrustN: 2 * 121000,
    numEngines: 2,
    tsfc: 1.6e-5,
    thrustLapseK: 0.7,
  },
};
