/**
 * FlightSim - Database Data Barrel
 */

export { default as aircraftsData } from './aircrafts.json';
export { default as liveriesData } from './liveries.json';

import aircraftsData from './aircrafts.json';
import liveriesData from './liveries.json';

export const aircraftsCount = (aircraftsData as any[]).length;
export const liveriesCount = (liveriesData as any[]).length;
