/**
 * FlightSim - AircraftTooltip
 * Всплывающая карточка с информацией о самолете
 */
import React, { useEffect, useState } from 'react';
import { useAircraftStore } from '../store/aircraft.store';
import type { Aircraft } from '../types/aircraft.types';

interface Props {
  map: maplibregl.Map | null;
}

export const AircraftTooltip: React.FC<Props> = ({ map }) => {
  const selectedId = useAircraftStore(s => s.selectedId);
  const aircraftMap = useAircraftStore(s => s.aircraft);
  const hoveredId = useAircraftStore(s => s.hoveredId);
  const selectAircraft = useAircraftStore(s => s.selectAircraft);

  const activeId = selectedId || hoveredId;
  const ac = activeId ? aircraftMap.get(activeId) ?? null : null;

  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!map || !ac) { setPos(null); return; }

    const update = () => {
      try {
        const p = map.project({ lng: ac.lng, lat: ac.lat } as any);
        setPos({ x: p.x, y: p.y });
      } catch { setPos(null); }
    };
    update();
    map.on('move', update);
    map.on('zoom', update);
    const iv = window.setInterval(update, 80);
    return () => { map.off('move', update); map.off('zoom', update); clearInterval(iv); };
  }, [map, ac]);

  if (!ac || !pos) return null;

  const isSelected = selectedId === ac.id;

  // offset to not cover marker
  const tooltipX = pos.x + 26;
  const tooltipY = pos.y - 10;

  const statusColor =
    ac.status === 'emergency' ? '#ff3355' :
    ac.status === 'climbing' ? '#00d4ff' :
    ac.status === 'descending' ? '#ffb700' :
    ac.altitude > 30000 ? '#cc00cc' : '#00ff8c';

  return (
    <div
      style={{
        position: 'absolute',
        left: tooltipX,
        top: tooltipY,
        zIndex: 30,
        pointerEvents: 'auto',
        transform: 'translate(0, -50%)',
        fontFamily: 'JetBrains Mono, monospace',
      }}
    >
      <div
        style={{
          background: 'rgba(10,10,16,0.92)',
          border: `1.5px solid ${statusColor}`,
          borderRadius: 12,
          padding: '10px 12px',
          minWidth: 200,
          maxWidth: 260,
          backdropFilter: 'blur(14px)',
          boxShadow: `0 0 18px ${statusColor}55, inset 0 0 20px ${statusColor}10`,
          color: '#e6ffe9',
        }}
      >
        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
            <span style={{ fontWeight: 800, fontSize: 13, letterSpacing: 0.5, color: '#fff' }}>{ac.callsign}</span>
            <span style={{ fontSize: 9, color: '#999', background: 'rgba(255,255,255,0.08)', borderRadius: 4, padding: '1px 4px' }}>{ac.aircraftType}</span>
          </div>
          {isSelected && (
            <button
              onClick={() => selectAircraft(null)}
              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#aaa', borderRadius: 6, width: 20, height: 20, cursor: 'pointer', fontSize: 12 }}
            >
              ✕
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 10 }}>
          <div>
            <div style={kvLabel}>ALTITUDE</div>
            <div style={{ ...kvValue, color: statusColor }}>{ac.altitude.toLocaleString()} ft</div>
            <div style={{ fontSize: 8, color: '#888' }}>FL{Math.floor(ac.altitude / 100)}</div>
          </div>
          <div>
            <div style={kvLabel}>SPEED</div>
            <div style={kvValue}>{ac.speed} kts</div>
            <div style={{ fontSize: 8, color: ac.verticalRate > 200 ? '#00d4ff' : ac.verticalRate < -200 ? '#ffb700' : '#888' }}>
              VS {ac.verticalRate > 0 ? '+' : ''}{ac.verticalRate} fpm
            </div>
          </div>
          <div>
            <div style={kvLabel}>HEADING</div>
            <div style={kvValue}>{Math.round(ac.heading)}°</div>
            <div style={{ fontSize: 8, color: '#888' }}>{headingToCompass(ac.heading)}</div>
          </div>
          <div>
            <div style={kvLabel}>SQUAWK</div>
            <div style={{ ...kvValue, color: '#ffae00' }}>{ac.squawk}</div>
            <div style={{ fontSize: 8, color: '#888' }}>{ac.icao24}</div>
          </div>
        </div>

        <div style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
          <span style={{ color: '#888' }}>{ac.origin || '----'} → {ac.destination || '----'}</span>
          <span style={{ color: statusColor, textTransform: 'uppercase', fontWeight: 700 }}>{ac.status}</span>
        </div>

        {/* arrow */}
        <div
          style={{
            position: 'absolute',
            left: -6,
            top: '50%',
            transform: 'translateY(-50%) rotate(45deg)',
            width: 10,
            height: 10,
            background: 'rgba(10,10,16,0.92)',
            borderLeft: `1.5px solid ${statusColor}`,
            borderBottom: `1.5px solid ${statusColor}`,
          }}
        />
      </div>
    </div>
  );
};

const kvLabel: React.CSSProperties = { color: '#666', fontSize: 8, letterSpacing: 0.8, marginBottom: 2 };
const kvValue: React.CSSProperties = { color: '#fff', fontSize: 11, fontWeight: 700 };

function headingToCompass(h: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  const idx = Math.round(h / 22.5) % 16;
  return dirs[idx];
}

export default AircraftTooltip;
