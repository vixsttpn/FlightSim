import React, { useEffect, useRef } from 'react';
import { useAircraftStore } from '../store/aircraft.store';
import type { Aircraft } from '../types/aircraft.types';
import maplibregl from 'maplibre-gl';

interface Props { map: maplibregl.Map | null; onSelect?: (ac: Aircraft) => void; }

function makeEl(ac: Aircraft, isSel: boolean, isHover: boolean): HTMLDivElement {
  const c = document.createElement('div');
  c.className = 'radar-ac';
  c.style.width = '40px'; c.style.height = '40px';
  c.style.display='flex'; c.style.alignItems='center'; c.style.justifyContent='center';
  c.style.cursor='pointer'; c.style.position='relative';
  const color = ac.status==='emergency' ? '#ff0033' : ac.altitude>30000 ? '#cc00cc' : ac.status==='climbing' ? '#00d4ff' : ac.status==='descending' ? '#ffae00' : '#00ff8c';
  const finalColor = isSel ? '#ffff66' : color;
  const size = isSel?28: isHover?24:18;
  c.innerHTML = `
    <div style="width:${size}px;height:${size}px;background:rgba(0,0,0,0.6);border:1.5px solid ${finalColor};border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 ${isSel?16:8}px ${finalColor}99;">
      <svg width="${size-6}" height="${size-6}" viewBox="0 0 24 24" fill="${finalColor}" style="transform:rotate(${ac.heading}deg)"><path d="M12 2 L13.5 8.5 L21 9 L13.5 12 L21 15 L13.5 15.5 L12 22 L10.5 15.5 L3 15 L10.5 12 L3 9 L10.5 8.5 Z"/></svg>
    </div>
    <div style="position:absolute;top:${size+3}px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:${finalColor};font:9px monospace;padding:1px 3px;border-radius:3px;white-space:nowrap;border:0.5px solid ${finalColor}66">${ac.callsign}<br/>${Math.floor(ac.altitude/100)}/${ac.speed}</div>
  `;
  return c;
}

export const AircraftLayer: React.FC<Props> = ({ map, onSelect }) => {
  const aircraftMap = useAircraftStore(s=>s.aircraft);
  const selectedId = useAircraftStore(s=>s.selectedId);
  const hoveredId = useAircraftStore(s=>s.hoveredId);
  const selectAircraft = useAircraftStore(s=>s.selectAircraft);
  const setHovered = useAircraftStore(s=>s.setHovered);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

  useEffect(()=>{
    if(!map) return;
    const list = Array.from(aircraftMap.values());
    for(const ac of list){
      let marker = markersRef.current.get(ac.id);
      const isSel = selectedId===ac.id;
      const isHover = hoveredId===ac.id;
      const el = makeEl(ac,isSel,isHover);
      el.addEventListener('mouseenter',()=>setHovered(ac.id));
      el.addEventListener('mouseleave',()=>setHovered(null));
      el.addEventListener('click',(e)=>{ e.stopPropagation(); selectAircraft(ac.id); onSelect?.(ac); });
      if(!marker){
        const nm = new maplibregl.Marker({element: el, anchor:'center'}).setLngLat([ac.lng, ac.lat]).addTo(map);
        markersRef.current.set(ac.id, nm);
      } else {
        marker.setLngLat([ac.lng, ac.lat]);
        const curEl = marker.getElement();
        // replace quickly
        curEl.innerHTML = el.innerHTML;
        const svg = curEl.querySelector('svg') as HTMLElement;
        if(svg) svg.style.transform = `rotate(${ac.heading}deg)`;
        curEl.onclick = (e:any)=>{ e.stopPropagation(); selectAircraft(ac.id); onSelect?.(ac); };
        (curEl as any).onmouseenter = ()=>setHovered(ac.id);
        (curEl as any).onmouseleave = ()=>setHovered(null);
      }
    }
    for(const [id,m] of markersRef.current.entries()){
      if(!aircraftMap.has(id)){ m.remove(); markersRef.current.delete(id); }
    }
  },[map, aircraftMap, selectedId, hoveredId, selectAircraft, setHovered, onSelect]);

  useEffect(()=>()=>{ for(const m of markersRef.current.values()) m.remove(); markersRef.current.clear(); },[]);

  return null;
};
export default AircraftLayer;
