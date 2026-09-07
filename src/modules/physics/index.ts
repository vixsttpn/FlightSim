/**
 * FlightSim - Physics Module Index
 * Model 8 - Full Physics Core + Legacy
 * Version 8+9 merged
 */

// Legacy systems (Model 9 maybe)
export * from './PhysicsCalculator';
export * from './FuelSystem';
export * from './AutopilotSystem';
export * from './LandingSystem';
export * from './SimulationLoop';

// === MODEL 8 - NEW PHYSICS CORE ===
export * from './constants/aero_constants';
export * from './constants/aircraft_database';
export * from './constants/flight_envelope';

export * from './models/aircraft_specs';
export * from './models/flight_state';
export * from './models/flight_plan';

export * from './FlightEngine';

// Re-export presets
export const PHYSICS_VERSION = '8.0.0-model8';
export const FIXED_TICK_HZ = 60;
export const MODEL8_READY = true;
