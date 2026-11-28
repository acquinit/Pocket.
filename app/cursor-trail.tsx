'use client';
import {useEffect} from 'react';

export default function CursorTrail(){
 useEffect(()=>{
  const fine=window.matchMedia('(pointer: fine)');
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  if(!fine.matches||reduce.matches)return;
  const dots:HTMLDivElement[]=[];
  for(let i=0;i<14;i++){
   const d=document.createElement('div');
   d.className='cursor-dot';
   d.style.setProperty('--s',(14-i*(10/13)).toFixed(2)+'px');
   d.style.opacity='0';
   document.body.appendChild(d);
   dots.push(d);
  }
  const pos=dots.map(()=>({x:-100,y:-100}));
  let tx=-100,ty=-100,last=performance.now(),raf=0,running=false;
  function stop(){if(raf)cancelAnimationFrame(raf);raf=0;running=false;for(const d of dots)d.style.opacity='0'}
  function frame(){
   const now=performance.now();
   pos[0].x=tx;pos[0].y=ty;
   for(let i=1;i<pos.length;i++){pos[i].x+=(pos[i-1].x-pos[i].x)*0.34;pos[i].y+=(pos[i-1].y-pos[i].y)*0.34}
   for(let i=0;i<dots.length;i++){
    dots[i].style.transform='translate('+pos[i].x.toFixed(2)+'px,'+pos[i].y.toFixed(2)+'px)';
    dots[i].style.opacity=(0.6*Math.pow(0.93,i)).toFixed(3);
   }
   if(now-last>2000&&Math.hypot(tx-pos[13].x,ty-pos[13].y)<0.5){stop();return}
   raf=requestAnimationFrame(frame);
  }
  function start(){if(running||document.hidden||reduce.matches)return;running=true;raf=requestAnimationFrame(frame)}
  function move(e:MouseEvent){tx=e.clientX;ty=e.clientY;last=performance.now();start()}
  function visibility(){if(document.hidden)stop();else if(running)start()}
  function motion(){if(reduce.matches){window.removeEventListener('mousemove',move);stop()}}
  window.addEventListener('mousemove',move,{passive:true});
  document.addEventListener('visibilitychange',visibility);
  reduce.addEventListener('change',motion);
  return ()=>{window.removeEventListener('mousemove',move);document.removeEventListener('visibilitychange',visibility);reduce.removeEventListener('change',motion);stop();for(const d of dots)d.remove()};
 },[]);
 return null;
}
