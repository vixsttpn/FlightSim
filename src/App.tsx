import React from 'react';
export default function App(){
  return (
    <div style={{padding:24, background:'#0F172A', minHeight:'100vh', color:'#fff', fontFamily:'monospace'}}>
      <h1>FLIGHTSIM v0.1 © 2026 — All Rights Reserved</h1>
      <p style={{opacity:0.7}}>Privacy: Offline-first, no data collection</p>
      <div style={{marginTop:24, padding:20, background:'#1E293B', borderRadius:16}}>
        <h2>RADAR ACTIVE</h2>
        <div style={{height:200, background:'#0F172A', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid #334155'}}>RADAR MAP READY</div>
      </div>
      <button style={{marginTop:16, background:'#CB00B6', color:'#fff', padding:'14px 28px', borderRadius:12, border:'none', fontWeight:900}}>ЗАПУСТИТЬ J2-001</button>
    </div>
  )
}
