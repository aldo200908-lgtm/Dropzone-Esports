export function soles(cents:number):string {
 return new Intl.NumberFormat("es-PE",{style:"currency",currency:"PEN",maximumFractionDigits:2}).format(cents/100);
}
export function peruDate(value:string):string {
 return new Intl.DateTimeFormat("es-PE",{dateStyle:"medium",timeStyle:"short",timeZone:"America/Lima"}).format(new Date(value));
}
export function minimumReached(confirmed:number,min:number):boolean { return confirmed>=min; }
export function marginCents(players:number,priceCents:number,prizeCents:number,costCents:number):number {
 return players*priceCents-prizeCents-costCents;
}
export function isConfigured():boolean {return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);}
export const brand={name:"DROPZONE ESPORTS",tagline:"COMPITE. JUEGA. GANA."};

/** Treat datetime-local inputs as Peru wall time (UTC-05, no DST). */
export function peruLocalToISO(value:string):string{
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw new Error("Fecha inválida");
 const date=new Date(value+":00-05:00");
 if(Number.isNaN(date.getTime()))throw new Error("Fecha inválida");
 return date.toISOString();
}
