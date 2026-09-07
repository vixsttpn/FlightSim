/**
 * FlightSim Module 8 - Flight State (50+ fields)
 * Full 6-DOF state + systems + environment + controls
 */

export type FlightPhase = 'PARKED' | 'TAXI' | 'TAKEOFF' | 'CLIMB' | 'CRUISE' | 'DESCENT' | 'APPROACH' | 'LANDING' | 'GO_AROUND';

export interface FlightState {
  // ============ Time & Identity ============ (1-5)
  timestamp: number;              // 1 - ms since epoch
  simTime: number;                // 2 - s since sim start
  dt: number;                     // 3 - s last frame delta
  aircraftId: string;             // 4 - e.g. "B738"
  callsign: string;               // 5

  // ============ Position & Earth ============ (6-12)
  latitude: number;               // 6 - degrees
  longitude: number;              // 7 - degrees
  altitudeMsl: number;            // 8 - m MSL
  altitudeAgl: number;            // 9 - m AGL
  altitudePressure: number;       // 10 - m pressure altitude
  groundElevation: number;        // 11 - m terrain
  headingTrue: number;            // 12 - deg true

  // ============ Velocity Vector ============ (13-20)
  velocityTas: number;            // 13 - m/s true airspeed
  velocityIas: number;            // 14 - m/s indicated
  velocityCas: number;            // 15 - m/s calibrated
  velocityEas: number;            // 16 - m/s equivalent
  velocityGround: number;         // 17 - m/s ground speed
  verticalSpeed: number;          // 18 - m/s (+ up)
  velocityNorth: number;          // 19 - m/s NED frame
  velocityEast: number;           // 20 - m/s

  // ============ Orientation ============ (21-26)
  pitch: number;                  // 21 - deg
  roll: number;                   // 22 - deg
  yaw: number;                    // 23 - deg (magnetic)
  angleOfAttack: number;          // 24 - deg
  sideslipAngle: number;          // 25 - deg beta
  flightPathAngle: number;        // 26 - deg gamma

  // ============ Angular Rates ============ (27-32)
  pitchRate: number;              // 27 - deg/s
  rollRate: number;               // 28 - deg/s
  yawRate: number;                // 29 - deg/s
  pBody: number;                  // 30 - rad/s body X
  qBody: number;                  // 31 - rad/s body Y
  rBody: number;                  // 32 - rad/s body Z

  // ============ Accelerations & Loads ============ (33-38)
  accelerationX: number;          // 33 - m/s² body
  accelerationY: number;          // 34 - m/s² body
  accelerationZ: number;          // 35 - m/s² body
  loadFactor: number;             // 36 - G
  loadFactorX: number;            // 37 - Gx
  loadFactorY: number;            // 38 - Gy

  // ============ Mass & Fuel ============ (39-44)
  totalMass: number;              // 39 - kg
  fuelMass: number;               // 40 - kg
  fuelFlow: number;               // 41 - kg/s
  emptyMass: number;              // 42 - kg
  payloadMass: number;            // 43 - kg
  cgPosition: number;             // 44 - m from datum, 0-1 normalized optional but using m

  // ============ Forces (computed) ============ (45-50)
  lift: number;                   // 45 - N
  drag: number;                   // 46 - N
  thrust: number;                 // 47 - N total
  weight: number;                 // 48 - N
  sideForce: number;              // 49 - N
  momentPitch: number;            // 50 - N·m

  // ============ Extended Forces & Moments ============
  momentRoll: number;             // 51
  momentYaw: number;              // 52

  // ============ Atmosphere ============ (53-58)
  airDensity: number;             // 53 - kg/m³
  airPressure: number;            // 54 - Pa
  airTemperature: number;         // 55 - K
  machNumber: number;             // 56
  speedOfSound: number;           // 57 - m/s
  windSpeed: number;              // 58 - m/s

  // ============ Controls State ============ (59-66)
  throttle: number;               // 59 - 0-1
  elevator: number;               // 60 - -1..1
  aileron: number;                // 61 - -1..1
  rudder: number;                 // 62 - -1..1
  flapsPosition: number;          // 63 - 0-1 (0 up, 1 full)
  gearDown: boolean;              // 64
  spoilers: number;               // 65 - 0-1
  brakes: number;                 // 66 - 0-1

  // ============ Systems & Phase ============ (67-70)
  phase: FlightPhase;             // 67
  onGround: boolean;              // 68
  stallWarning: boolean;          // 69
  engineRunning: boolean;         // 70

  // Additional telemetry
  qnh_hPa: number;                // 71
  magneticVariation: number;      // 72
  energyHeight: number;           // 73 - m specific energy
}

export function createDefaultFlightState(aircraftId = 'C172'): FlightState {
  return {
    timestamp: Date.now(),
    simTime: 0,
    dt: 0.016,
    aircraftId,
    callsign: 'FLT001',
    latitude: 55.7558,
    longitude: 37.6173,
    altitudeMsl: 150,
    altitudeAgl: 150,
    altitudePressure: 150,
    groundElevation: 0,
    headingTrue: 0,
    velocityTas: 0,
    velocityIas: 0,
    velocityCas: 0,
    velocityEas: 0,
    velocityGround: 0,
    verticalSpeed: 0,
    velocityNorth: 0,
    velocityEast: 0,
    pitch: 0,
    roll: 0,
    yaw: 0,
    angleOfAttack: 2,
    sideslipAngle: 0,
    flightPathAngle: 0,
    pitchRate: 0,
    rollRate: 0,
    yawRate: 0,
    pBody: 0,
    qBody: 0,
    rBody: 0,
    accelerationX: 0,
    accelerationY: 0,
    accelerationZ: -9.80665,
    loadFactor: 1,
    loadFactorX: 0,
    loadFactorY: 0,
    totalMass: 1100,
    fuelMass: 100,
    fuelFlow: 0,
    emptyMass: 800,
    payloadMass: 200,
    cgPosition: 0.25,
    lift: 0,
    drag: 0,
    thrust: 0,
    weight: 10786,
    sideForce: 0,
    momentPitch: 0,
    momentRoll: 0,
    momentYaw: 0,
    airDensity: 1.225,
    airPressure: 101325,
    airTemperature: 288.15,
    machNumber: 0,
    speedOfSound: 340.294,
    windSpeed: 0,
    throttle: 0,
    elevator: 0,
    aileron: 0,
    rudder: 0,
    flapsPosition: 0,
    gearDown: true,
    spoilers: 0,
    brakes: 0.5,
    phase: 'PARKED',
    onGround: true,
    stallWarning: false,
    engineRunning: false,
    qnh_hPa: 1013.25,
    magneticVariation: 0,
    energyHeight: 150
  };
}
