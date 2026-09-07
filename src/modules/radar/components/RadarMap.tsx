
import React, {useRef,useEffect} from 'react';
export const RadarMap: React.FC = () => {
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const c=ref.current; if(!c) return; const ctx=c.getContext('2d'); if(!ctx) return;
    let a=0;
    const loop=()=>{
      if(!ctx||!c) return;
      ctx.fillStyle='#0F172A'; ctx.fillRect(0,0,c.width,c.height);
      ctx.strokeStyle='#1E293B'; for(let i=0;i<c.width;i+=50){ ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,c.height); ctx.stroke(); }
      ctx.save(); ctx.translate(c.width/2,c.height/2); ctx.rotate(a); ctx.strokeStyle='rgba(203,0,182,0.6)'; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-300); ctx.stroke(); ctx.restore();
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(c.width*0.5,c.height*0.5,6,0,Math.PI*2); ctx.fill();
      a+=0.02; requestAnimationFrame(loop);
    }; loop();
  },[]);
  return <canvas ref={ref} width={800} height={600} style={{width:'100%',height:'60vh',borderRadius:12}} />;
};
export default RadarMap;
