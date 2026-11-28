'use client';
import {useMemo} from 'react';

const steps=16;
function ring(cx:number,cy:number,r:number,seed:number){
 const p:Array<[number,number]>=[];
 for(let i=0;i<steps;i++){
  const a=i/steps*Math.PI*2;
  const rr=r*(1+0.13*Math.sin(2*a+seed)+0.08*Math.sin(3*a-1.3*seed)+0.04*Math.sin(5*a+0.7*seed));
  p.push([cx+Math.cos(a)*rr,cy+Math.sin(a)*rr]);
 }
 const n=(i:number)=>p[(i+steps)%steps];
 let d='M'+p[0][0].toFixed(2)+' '+p[0][1].toFixed(2);
 for(let i=0;i<steps;i++){
  const a=n(i-1),b=n(i),c=n(i+1),e=n(i+2);
  d+='C'+(b[0]+(c[0]-a[0])/6).toFixed(2)+' '+(b[1]+(c[1]-a[1])/6).toFixed(2)+' '+(c[0]-(e[0]-b[0])/6).toFixed(2)+' '+(c[1]-(e[1]-b[1])/6).toFixed(2)+' '+c[0].toFixed(2)+' '+c[1].toFixed(2);
 }
 return d+'Z';
}

export default function ContourBackground(){
 const clusters=useMemo(()=>[[300,290,0.4],[1130,630,2.1]].map(([cx,cy,base],k)=>Array.from({length:8},(_,i)=>ring(cx,cy,46+i*22,base+i*0.35+k))),[]);
 return <svg className="contour-bg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  {clusters.map((rings,k)=><g className={'contour-cluster contour-cluster-'+k} key={k}>
   {rings.map((d,i)=><path key={i} d={d} className={i%3===0?'contour-major':''} style={{animationDelay:(-(i*0.75+k*0.35)).toFixed(2)+'s'}}/>)}
  </g>)}
  <text className="contour-label" x="24" y="32">01 / CASHFLOW</text>
  <text className="contour-label" x="24" y="874">02 / BALANCE</text>
 </svg>;
}
