import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { isConfigured } from "@/lib/utils";

export async function serverSupabase(){
 if(!isConfigured()) return null;
 const jar=await cookies();
 return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{
  cookies:{
   getAll(){return jar.getAll();},
   setAll(items){try{items.forEach(({name,value,options})=>jar.set(name,value,options));}catch{/* server render may not set cookies */}}
  }
 });
}
