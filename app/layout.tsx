import type { Metadata } from "next";
import "./globals.css";
import "./orbit-design.css";
export const metadata:Metadata={title:"Orbit — Meu espaço",description:"Suas páginas, ideias e projetos em um só lugar.",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>;}
