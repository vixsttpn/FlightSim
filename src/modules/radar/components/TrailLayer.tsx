/**
 * FlightSim - TrailLayer
 * Отрисовка следов самолетов на canvas поверх MapLibre
 */
import React, { useRef, useEffect } from 'react';
import { useAircraftStore } from '../store/aircraft.store';
import { useMapStore } from '../store/map.store';

interface Props {
  map: maplibregl.Map | null;
}

export const TrailLayer: React.FC<Props> = ({ map }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const aircraftMap = useAircraftStore(s => s.aircraft);
  const showTrails = useMapStore(s => s.showTrails);
  const hoveredId = useAircraftStore(s => s.hoveredId);
  const selectedId = useAircraftStore(s => s.selectedId);

  useEffect(() => {
    if (!map || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const draw = () => {
      const rect = map.getContainer().getBoundingClientRect();
      const dpr = window.devicePixelRatio;
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      ctx.clearRect(0, 0, rect.width, rect.height);

      if (!showTrails) return;

      const aircraftList = Array.from(aircraftMap.values());

      for (const ac of aircraftList) {
        if (!ac.trail || ac.trail.length < 2) continue;

        const isHighlighted = ac.id === hoveredId || ac.id === selectedId;
        const points = ac.trail
          .map(p => {
            try {
              const proj = map.project({ lng: p.lng, lat: p.lat } as any);
              return proj;
            } catch {
              return null;
            }
          })
          .filter(Boolean) as { x: number; y: number }[];

        if (points.length < 2) continue;

        // gradient trail alpha from old to new
        ctx.lineWidth = isHighlighted ? 2.5 : 1.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // draw segmented with fading alpha
        for (let i = 1; i < points.length; i++) {
          const alpha = (i / points.length) * (isHighlighted ? 0.9 : 0.45);
          const prev = points[i - 1];
          const curr = points[i];

          // color coding by altitude
          // low: cyan, mid: green, high: magenta #CC00CC themed
          let color: string;
          if (ac.altitude < 15000) color = `rgba(0,220,255,${alpha})`;
          else if (ac.altitude < 30000) color = `rgba(0,255,140,${alpha})`;
          else color = `rgba(204,0,204,${alpha})`; // фирменный пурпурный для высоких

          if (isHighlighted) {
            color = `rgba(255,255,120,${alpha})`;
          }

          ctx.strokeStyle = color;
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(curr.x, curr.y);
          ctx.stroke();
        }

        // current position glow
        try {
          const cur = map.project({ lng: ac.lng, lat: ac.lat } as any);
          ctx.fillStyle = isHighlighted ? 'rgba(255,255,100,0.7)' : 'rgba(0,255,140,0.4)';
          ctx.beginPath();
          ctx.arc(cur.x, cur.y, isHighlighted ? 6 : 3.5, 0, Math.PI * 2);
          ctx.fill();
        } catch {}
      }
    };

    draw();
    map.on('move', draw);
    map.on('zoom', draw);
    map.on('resize', draw);

    // also listen to aircraft updates via interval - redraw frequently
    const interval = window.setInterval(draw, 100);

    return () => {
      map.off('move', draw);
      map.off('zoom', draw);
      map.off('resize', draw);
      clearInterval(interval);
    };
  }, [map, aircraftMap, showTrails, hoveredId, selectedId]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 4,
      }}
    />
  );
};

export default TrailLayer;
