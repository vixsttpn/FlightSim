/**
 * FlightSim - RadarSweepLayer
 * Радарная развертка: грид (окружности + радиальные линии) и свип-анимация
 */
import React, { useRef, useEffect } from 'react';
import { useMapStore } from '../store/map.store';
import { RADAR_DEFAULT_CENTER } from '../types/aircraft.types';

interface Props {
  map: maplibregl.Map | null;
  canvasContainerId?: string;
}

const RADIALS = 12; // каждые 30 град
const RANGE_STEPS_NM = [25, 50, 100, 150, 200, 250, 300];

export const RadarSweepLayer: React.FC<Props> = ({ map }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sweepCanvasRef = useRef<HTMLCanvasElement>(null);
  const { showGrid, showSweep, sweepAngle, radarRangeNm } = useMapStore();

  // helper meters per pixel
  const getMetersPerPixel = (lat: number, zoom: number) => {
    const earthCircumference = 40075017; // meters
    return (earthCircumference * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom + 8);
  };

  // main grid draw
  useEffect(() => {
    if (!map || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const drawGrid = () => {
      if (!showGrid) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      const rect = map.getContainer().getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const centerLngLat = RADAR_DEFAULT_CENTER;
      const centerPoint = map.project({ lng: centerLngLat[0], lat: centerLngLat[1] } as any);
      const zoom = map.getZoom();
      const lat = centerLngLat[1];
      const mPerPx = getMetersPerPixel(lat, zoom);

      ctx.save();
      ctx.translate(centerPoint.x, centerPoint.y);

      // range circles
      ctx.strokeStyle = 'rgba(0, 255, 120, 0.18)';
      ctx.lineWidth = 1;
      RANGE_STEPS_NM.forEach(nm => {
        if (nm > radarRangeNm) return;
        const meters = nm * 1852;
        const radiusPx = meters / mPerPx;
        if (radiusPx > 2000) return;

        ctx.beginPath();
        ctx.arc(0, 0, radiusPx, 0, Math.PI * 2);
        ctx.stroke();

        // label
        if (radiusPx > 30) {
          ctx.fillStyle = 'rgba(0, 255, 140, 0.55)';
          ctx.font = '10px JetBrains Mono, monospace';
          ctx.fillText(`${nm} NM`, radiusPx + 4, -4);
        }
      });

      // crosshair center
      ctx.strokeStyle = 'rgba(0, 255, 140, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(12, 0);
      ctx.moveTo(0, -12);
      ctx.lineTo(0, 12);
      ctx.stroke();

      // radial lines
      ctx.strokeStyle = 'rgba(0, 255, 120, 0.12)';
      ctx.lineWidth = 0.8;
      // max radius
      const maxMeters = radarRangeNm * 1852;
      const maxRadius = maxMeters / mPerPx;
      for (let i = 0; i < RADIALS; i++) {
        const ang = (i * 360) / RADIALS;
        const rad = (ang * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(rad) * maxRadius, Math.sin(rad) * maxRadius);
        ctx.stroke();
      }

      // outer glow ring
      ctx.strokeStyle = 'rgba(204,0,204,0.35)'; // фирменный пурпурный
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, maxRadius, 0, Math.PI * 2);
      ctx.stroke();

      // inner soft glow
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, maxRadius);
      grad.addColorStop(0, 'rgba(0,255,140,0.04)');
      grad.addColorStop(0.6, 'rgba(0,255,140,0.01)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, maxRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    drawGrid();
    map.on('move', drawGrid);
    map.on('zoom', drawGrid);
    map.on('resize', drawGrid);

    return () => {
      map.off('move', drawGrid);
      map.off('zoom', drawGrid);
      map.off('resize', drawGrid);
    };
  }, [map, showGrid, radarRangeNm]);

  // sweep animation canvas
  useEffect(() => {
    if (!map || !sweepCanvasRef.current) return;
    const canvas = sweepCanvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let raf = 0;
    const drawSweep = () => {
      if (!showSweep) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      const rect = map.getContainer().getBoundingClientRect();
      if (canvas.width !== rect.width * window.devicePixelRatio || canvas.height !== rect.height * window.devicePixelRatio) {
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
      } else {
        ctx.clearRect(0, 0, rect.width, rect.height);
      }

      const centerLngLat = RADAR_DEFAULT_CENTER;
      const centerPoint = map.project({ lng: centerLngLat[0], lat: centerLngLat[1] } as any);
      const zoom = map.getZoom();
      const lat = centerLngLat[1];
      const mPerPx = getMetersPerPixel(lat, zoom);
      const maxRadius = (radarRangeNm * 1852) / mPerPx;

      ctx.save();
      ctx.translate(centerPoint.x, centerPoint.y);

      const sweepRad = (sweepAngle * Math.PI) / 180;
      const tailRad = ((sweepAngle - 35) * Math.PI) / 180;

      // sweep trailing gradient wedge
      const sweepGrad = ctx.createConicGradient(tailRad, 0, 0);
      // conic gradient doesn't exist everywhere, fallback to radial sweep wedge
      // We'll draw wedge manually with alpha fade

      // wedge with fading alpha
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, maxRadius, tailRad, sweepRad);
      ctx.closePath();

      const wedgeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, maxRadius);
      wedgeGrad.addColorStop(0, 'rgba(0,255,140,0.18)');
      wedgeGrad.addColorStop(0.7, 'rgba(0,255,140,0.06)');
      wedgeGrad.addColorStop(1, 'rgba(0,255,140,0.0)');

      ctx.fillStyle = wedgeGrad;
      // clip to wedge angle for conic effect using canvas composite with alpha mask drawn via linear steps
      ctx.fill();

      // add second brighter inner wedge
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, maxRadius, sweepRad - 0.15, sweepRad);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0,255,200,0.9)';
      ctx.fill();
      ctx.globalAlpha = 1;

      // main sweep line
      ctx.strokeStyle = 'rgba(80,255,180,0.95)';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(0,255,140,0.8)';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(sweepRad) * maxRadius, Math.sin(sweepRad) * maxRadius);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // center pulse
      const pulse = (Date.now() % 2000) / 2000;
      ctx.fillStyle = `rgba(0,255,140,${0.35 * (1 - pulse)})`;
      ctx.beginPath();
      ctx.arc(0, 0, 8 + pulse * 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#00ff8c';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const loop = () => {
      drawSweep();
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => cancelAnimationFrame(raf);
  }, [map, sweepAngle, showSweep, radarRangeNm]);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />
      <canvas
        ref={sweepCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />
    </>
  );
};

export default RadarSweepLayer;
