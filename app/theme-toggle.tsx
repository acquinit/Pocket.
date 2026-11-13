'use client';
import {useEffect,useState} from 'react';
import {Sun,Moon} from 'lucide-react';
export default function ThemeToggle(){
 const [theme,setTheme]=useState('dark');
 useEffect(()=>{setTheme(document.documentElement.dataset.theme||'dark')},[]);
 function toggle(){const next=theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;setTheme(next);try{localStorage.setItem('pocket-theme',next)}catch{}}
 return <button className="icon-button theme-toggle" onClick={toggle} aria-label={'Switch to '+(theme==='dark'?'light':'dark')+' mode'} title={'Switch to '+(theme==='dark'?'light':'dark')+' mode'}>{theme==='dark'?<Sun size={20}/>:<Moon size={20}/>}</button>;
}
