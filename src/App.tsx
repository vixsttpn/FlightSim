import React from 'react';
import { RadarMap } from './modules/radar/components/RadarMap';
export default function App(){
  return <div style={{padding:16, background:'#0F172A', minHeight:'100vh', color:'#fff'}}>
    <h1>FLIGHTSIM v0.1 © 2026 - Copying Prohibited</h1>
    <RadarMap />
  </div>
}
