import type { Metadata } from 'next';
import './globals.css';
import './refinement.css';
import './ledger-polish.css';
import './mobile.css';
export const viewport={width:'device-width',initialScale:1,viewportFit:'cover',interactiveWidget:'resizes-content' as const};
export const metadata:Metadata={title:'Pocket · Daily Budget',description:'A little clarity for your everyday money.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" data-theme="dark" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:"try{document.documentElement.dataset.theme=localStorage.getItem('pocket-theme')==='light'?'light':'dark'}catch{}"}}/></head><body>{children}</body></html>}
