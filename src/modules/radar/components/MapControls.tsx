/**
 * FlightSim - MapControls
 * Контролы карты: зум, рецентр, переключение слоев, дальность
 */
import React from 'react';
import { useMapStore } from '../store/map.store';
import { useAircraftStore } from '../store/aircraft.store';

interface Props {
  map: maplibregl.Map | null;
}

export const MapControls: React.FC<Props> = ({ map }) => {
  const {
    zoom, showGrid, showSweep, showTrails, radarRangeNm,
    toggleGrid, toggleSweep, toggleTrails, setRadarRange, recenter, setZoom
  } = useMapStore();

  const aircraftCount = useAircraftStore(s => s.aircraft.size);
  const showTrailsStore = useAircraftStore(s => s.showTrails);
  const toggleTrailsStore = useAircraftStore(s => s.toggleTrails);

  const handleZoomIn = () => {
    if (!map) return;
    const z = Math.min(map.getZoom() + 1, 18);
    map.easeTo({ zoom: z, duration: 300 });
    setZoom(z);
  };
  const handleZoomOut = () => {
    if (!map) return;
    const z = Math.max(map.getZoom() - 1, 3);
    map.easeTo({ zoom: z, duration: 300 });
    setZoom(z);
  };

  const handleRecenter = () => {
    recenter();
    if (!map) return;
    map.flyTo({ center: [49.8, 40.4], zoom: 8.5, bearing: 0, pitch: 0, duration: 800 });
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'auto',
      }}
    >
      {/* Zoom */}
      <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(12,12,18,0.88)', border: '1px solid rgba(204,0,204,0.35)', borderRadius: 10, overflow: 'hidden', backdropFilter: 'blur(10px)' }}>
        <button onClick={handleZoomIn} style={btnStyle}>＋</button>
        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />
        <button onClick={handleZoomOut} style={btnStyle}>−</button>
        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />
        <button onClick={handleRecenter} style={{ ...btnStyle, fontSize: 14 }}>◎</button>
      </div>

      {/* Layers */}
      <div style={{ background: 'rgba(12,12,18,0.88)', border: '1px solid rgba(0,255,140,0.18)', borderRadius: 10, padding: 10, minWidth: 140, backdropFilter: 'blur(10px)' }}>
        <div style={{ color: '#8affc2', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1, marginBottom: 8, opacity: 0.9 }}>RADAR LAYERS</div>

        <label style={toggleRow}>
          <input type="checkbox" checked={showGrid} onChange={toggleGrid} style={checkboxStyle} />
          <span style={labelTxt}>Grid</span>
          <span style={{ ...dot, background: showGrid ? '#00ff8c' : '#333' }} />
        </label>

        <label style={toggleRow}>
          <input type="checkbox" checked={showSweep} onChange={toggleSweep} style={checkboxStyle} />
          <span style={labelTxt}>Sweep</span>
          <span style={{ ...dot, background: showSweep ? '#00ffcc' : '#333' }} />
        </label>

        <label style={toggleRow}>
          <input type="checkbox" checked={showTrails && showTrailsStore} onChange={() => { toggleTrails(); toggleTrailsStore(); }} style={checkboxStyle} />
          <span style={labelTxt}>Trails</span>
          <span style={{ ...dot, background: showTrails && showTrailsStore ? '#cc00cc' : '#333' }} />
        </label>

        <div style={{ marginTop: 12 }}>
          <div style={{ color: '#aaa', fontSize: 10, fontFamily: 'monospace', marginBottom: 4 }}>RANGE {radarRangeNm} NM</div>
          <input
            type="range"
            min={50}
            max={400}
            step={25}
            value={radarRangeNm}
            onChange={e => setRadarRange(parseInt(e.target.value))}
            style={{ width: '100%', accentColor: '#cc00cc' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', fontSize: 9, fontFamily: 'monospace' }}>
            <span>50</span><span>400 NM</span>
          </div>
        </div>

        <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
          <div style={{ color: '#888', fontSize: 9, fontFamily: 'monospace' }}>ZOOM {zoom.toFixed(1)}</div>
          <div style={{ color: '#cc00cc', fontSize: 10, fontFamily: 'monospace', fontWeight: 700 }}>{aircraftCount} TARGETS</div>
          <div style={{ color: '#00ff8c', fontSize: 8, fontFamily: 'monospace', marginTop: 2 }}>● LIVE ● AZE RADAR</div>
        </div>
      </div>
    </div>
  );
};

const btnStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  background: 'transparent',
  color: '#e0ffe9',
  border: 'none',
  fontSize: 18,
  fontWeight: 800,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const toggleRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  cursor: 'pointer',
  marginBottom: 6,
};

const checkboxStyle: React.CSSProperties = {
  display: 'none',
} as any;

const labelTxt: React.CSSProperties = {
  color: '#d0d0d0',
  fontSize: 11,
  fontFamily: 'JetBrains Mono, monospace',
  flex: 1,
};

const dot: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: 4,
  display: 'inline-block',
  boxShadow: '0 0 6px currentColor',
};

export default MapControls;
