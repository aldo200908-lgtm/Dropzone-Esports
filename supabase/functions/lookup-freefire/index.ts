// Edge Function 'lookup-freefire' for optional external nickname retrieval.
// Provider: Volsever (unofficial); keep VOLSEVER_API_KEY in Supabase Edge Function Secrets.
// Deploy with verify_jwt=false; token is verified below with auth.getUser.
// Only expose safe nickname/region/level fields.
import { createClient } from "npm:@supabase/supabase-js@2";

const origin = "https://aldo200908-lgtm.github.io";
const cors = {
 "Access-Control-Allow-Origin": origin,
 "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
 "Access-Control-Allow-Methods": "POST, OPTIONS",
 "Content-Type": "application/json; charset=utf-8",
 "Cache-Control": "no-store"
};
function reply(data:Record<string,unknown>, status=200) {
 return new Response(JSON.stringify(data),{status,headers:cors});
}
Deno.serve(async request => {
 if(request.method==="OPTIONS") return new Response(null,{status:204,headers:cors});
 if(request.method!=="POST") return reply({error:"Método no permitido"},405);
 const authHeader=request.headers.get("authorization")||"";
 if(!authHeader.startsWith("Bearer ")) return reply({error:"Inicia sesión para buscar tu nickname"},401);
 const supabaseUrl=Deno.env.get("SUPABASE_URL")||"";
 const publicKey=Deno.env.get("SUPABASE_ANON_KEY")||Deno.env.get("SUPABASE_PUBLISHABLE_KEY")||"";
 const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(!supabaseUrl||!publicKey||!serviceKey) return reply({error:"Configuración de servidor incompleta"},503);
 const userClient=createClient(supabaseUrl,publicKey,{
  global:{headers:{Authorization:authHeader}},
  auth:{persistSession:false,autoRefreshToken:false}
 });
 const {data:{user},error:userError}=await userClient.auth.getUser();
 if(userError||!user) return reply({error:"Sesión no válida"},401);
 let uid="";
 try{
  const raw=await request.json();
  uid=String(raw.uid??"").trim();
 }catch{return reply({error:"Solicitud inválida"},400)}
 if(!/^[0-9]{5,15}$/.test(uid))return reply({error:"Introduce un UID válido de 5 a 15 dígitos"},400);
 const admin=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:cached}=await admin.from("freefire_lookup_cache").select("uid,nickname,region,level,fetched_at").eq("uid",uid).maybeSingle();
 if(cached && Date.now()-Date.parse(cached.fetched_at)<24*60*60*1000){
  return reply({uid:cached.uid,nickname:cached.nickname,region:cached.region,level:cached.level,source:"external_provider_cache",cached:true});
 }
 const key=Deno.env.get("VOLSEVER_API_KEY")||"";
 if(!key) return reply({error:"La consulta externa todavía no está configurada"},503);
 const {data:allowed,error:limitError}=await userClient.rpc("claim_freefire_lookup");
 if(limitError)return reply({error:"Límite de búsqueda no disponible"},503);
 if(!allowed)return reply({error:"Has alcanzado el límite de 10 consultas por hora"},429);
 let response:Response;
 try{
  response=await fetch("https://gate.volsever.com/proxy/api/game/free-fire-global?id="+encodeURIComponent(uid),{
   headers:{"X-API-Key":key,"Accept":"application/json"},
   signal:AbortSignal.timeout(9000)
  });
 }catch{return reply({error:"No se pudo contactar al proveedor externo"},502)}
 if(response.status===404)return reply({error:"UID no encontrado en el proveedor externo"},404);
 if(response.status===429)return reply({error:"Proveedor saturado; inténtalo más tarde"},429);
 if(response.status===402)return reply({error:"Proveedor sin saldo de consultas"},503);
 if(!response.ok)return reply({error:"El proveedor no pudo completar la consulta"},502);
 let json:Record<string,unknown>;
 try{json=await response.json()}catch{return reply({error:"Respuesta inválida del proveedor"},502)}
 const data=(json.data??{}) as Record<string,unknown>;
 const nickname=typeof data.username==="string"?data.username.trim():"";
 const echoedId=String(data.user_id??"");
 const region=typeof data.region==="string"?data.region.slice(0,24):null;
 const level=typeof data.level==="number"&&Number.isFinite(data.level)?data.level:null;
 if(!nickname||echoedId!==uid)return reply({error:"El proveedor no devolvió datos verificables para este UID"},502);
 await admin.from("freefire_lookup_cache").upsert({uid,nickname,region,level,fetched_at:new Date().toISOString()});
 return reply({uid,nickname,region,level,source:"external_provider",cached:false});
});
