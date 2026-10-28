import type {Metadata} from "next";
import "./globals.css";
import {SiteHeader,SiteFooter} from "@/components/shell";
export const metadata:Metadata={title:{default:"DROPZONE ESPORTS | Compite. Juega. Gana.",template:"%s | DROPZONE ESPORTS"},description:"Plataforma de torneos competitivos. Únete a la comunidad, consulta torneos gratuitos y sigue tu clasificación."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body className="min-h-screen"><SiteHeader/><main className="min-h-[70vh]">{children}</main><SiteFooter/></body></html>;}
