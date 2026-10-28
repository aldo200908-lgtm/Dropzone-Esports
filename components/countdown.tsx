"use client";
import {useEffect,useState} from "react";
import {Clock3} from "lucide-react";
function remaining(iso:string){const delta=new Date(iso).getTime()-Date.now();if(delta<=0)return "Evento iniciado o finalizado";const days=Math.floor(delta/86400000);const hours=Math.floor((delta%86400000)/3600000);const minutes=Math.floor((delta%3600000)/60000);return days>0?days+"d "+hours+"h restantes":hours+"h "+minutes+"m restantes";}
export function Countdown({iso}:{iso:string}){const [text,setText]=useState("Próximamente");useEffect(()=>{const update=()=>setText(remaining(iso));update();const timer=setInterval(update,60000);return()=>clearInterval(timer);},[iso]);return <span className="inline-flex gap-1 items-center"><Clock3 size={13}/>{text}</span>}
