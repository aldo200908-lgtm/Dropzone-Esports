"use strict";
(() => {
 const config=window.DROPZONE_SUPABASE||{};
 const $=id=>document.getElementById(id);
 const validUid=uid=>/^[0-9]{5,15}$/.test(uid);
 const buttons=()=>[$("uid-search-button"),$("uid-live-button")];
 const notify=(text,kind="info")=>{
  const el=$("uid-message");el.textContent=text;el.dataset.kind=kind;el.hidden=false;
 };
 const clear=()=>{
  $("uid-message").hidden=true;
  $("uid-result").hidden=true;
  $("uid-no-results").hidden=true;
 };
 function display(uid,nickname,source,region=null,level=null){
  clear();
  $("uid-result-name").textContent=nickname;
  $("uid-result-uid").textContent=uid;
  $("uid-result-source").textContent=source==="external"?"PROVEEDOR EXTERNO · NO OFICIAL":"DROPZONE · PERFIL PÚBLICO";
  $("uid-result-warning").textContent=source==="external"
   ?"Datos suministrados por un proveedor externo independiente, no por Garena. Mostrar un UID y nickname no prueba propiedad de la cuenta."
   :"Nickname registrado voluntariamente en DROPZONE, sin verificar contra el videojuego.";
  $("uid-result-region-row").hidden=!region;
  $("uid-result-level-row").hidden=level===null;
  $("uid-result-region").textContent=region||"";
  $("uid-result-level").textContent=level===null?"":String(level);
  $("uid-result").hidden=false;
 }
 async function run(){
  const configured=config.url&&config.publishableKey&&window.supabase?.createClient;
  if(!configured){
   notify("El buscador todavía necesita la conexión con Supabase.","error");
   $("uid-search-button").disabled=true;return;
  }
  const supabase=window.supabase.createClient(config.url,config.publishableKey);
  const externalEnabled=config.freefireLookupEnabled===true;
  $("uid-live-button").disabled=!externalEnabled;
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user){
   notify("Inicia sesión para buscar jugadores. <No se ha realizado ninguna consulta>.".replace(" <No se ha realizado ninguna consulta>",""),"info");
   $("uid-search-button").disabled=true;$("uid-live-button").disabled=true;
   const message=$("uid-message");
   const link=document.createElement("a");link.href="./acceso.html";link.textContent=" Iniciar sesión";link.className="account-link";
   message.appendChild(link);
   return;
  }
  $("uid-search-form").addEventListener("submit",async event=>{
   event.preventDefault();clear();
   const uid=String($("uid-input").value||"").trim();
   if(!validUid(uid)){notify("El UID debe contener entre 5 y 15 dígitos.","error");return}
   $("uid-search-button").disabled=true;$("uid-search-button").textContent="BUSCANDO...";
   try{
    const {data,error}=await supabase.rpc("lookup_dropzone_uid",{player_uid:uid});
    if(error){notify("No pudimos consultar. Comprueba que la migración 005 esté instalada.","error");return}
    const player=Array.isArray(data)?data[0]:null;
    if(player && typeof player.nickname==="string") display(uid,player.nickname,"dropzone");
    else $("uid-no-results").hidden=false;
   }catch{notify("No se pudo completar la búsqueda. Revisa tu conexión.","error")}
   finally{$("uid-search-button").disabled=false;$("uid-search-button").textContent="BUSCAR NICKNAME →"}
  });
  $("uid-live-button").addEventListener("click",async()=>{
   clear();
   const uid=String($("uid-input").value||"").trim();
   if(!validUid(uid)){notify("Introduce un UID válido antes de consultar el juego.","error");return}
   buttons().forEach(b=>b.disabled=true);
   $("uid-live-button").textContent="CONSULTANDO...";
   try{
    const {data,error}=await supabase.functions.invoke("lookup-freefire",{body:{uid}});
    if(error)throw new Error(error.message);
    if(!data||typeof data.nickname!=="string"||data.uid!==uid)throw new Error("Resultado no válido");
    display(uid,data.nickname,"external",data.region??null,Number.isFinite(data.level)?data.level:null);
   }catch{notify("La consulta externa no está disponible o el proveedor no pudo localizar el UID.","error")}
   finally{$("uid-search-button").disabled=false;$("uid-live-button").disabled=!externalEnabled;$("uid-live-button").textContent="CONSULTAR NICKNAME DEL JUEGO"}
  });
 }
 document.addEventListener("DOMContentLoaded",()=>{run().catch(()=>notify("No se pudo iniciar el buscador.","error"))});
})();