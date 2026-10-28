/* DROPZONE ESPORTS · Payments demo, no financial processing.
 * Never accepts card/payment credentials or creates a real order.
 * Real payments need server-side order creation, provider confirmation and authorization.
 */
"use strict";
(() => {
 const $=id=>document.getElementById(id);
 const configuration=window.DROPZONE_PAYMENTS||{};
 const options=Object.freeze({
  solo:{title:"SOLO SURVIVOR",amount:300,description:"DROPZONE CUP"},
  squad:{title:"TEAM SHOWDOWN",amount:200,description:"CLUTCH ARENA"},
  final:{title:"CHAMPIONS NIGHT",amount:500,description:"THE FINAL ZONE"}
 });
 const methods=Object.freeze({
  yape:{
   name:"Yape",symbol:"Y",title:"Pago con Yape",subtitle:"Billetera digital · Perú",
   description:"En un torneo habilitado, el jugador podrá usar Yape según las condiciones del medio de cobro. La inscripción se confirmará solo cuando el pago sea verificado.",
   steps:["Se creará una orden con un importe fijo y una referencia única.","Se mostrarán únicamente las instrucciones del comercio autorizado o el checkout del proveedor.","El servidor verificará el pago recibido antes de confirmar el cupo."],
   note:"La integración podrá hacerse mediante una pasarela compatible o verificación manual documentada. No hay QR ni número de pago configurado."
  },
  plin:{
   name:"Plin",symbol:"P",title:"Pago con Plin",subtitle:"Billetera digital · Perú",
   description:"Plin podrá ser una alternativa para quienes prefieren transferir mediante billetera. Su disponibilidad dentro de un checkout dependerá de la pasarela elegida.",
   steps:["El usuario elige Plin y recibe instrucciones oficiales autorizadas.","El pago se realiza desde su billetera, nunca mediante credenciales introducidas en DROPZONE.","El organizador o la pasarela confirma el ingreso antes de reservar el cupo."],
   note:"No asumimos que Plin esté habilitado en CulqiOnline. Si se usa validación manual, una captura no demuestra por sí sola que se haya pagado."
  },
  card:{
   name:"Tarjeta",symbol:"▤",title:"Tarjetas de crédito y débito",subtitle:"Visa · Mastercard · Amex · Diners (según pasarela)",
   description:"En el futuro, el jugador será enviado a un checkout certificado. DROPZONE no almacenará números de tarjeta ni CVV.",
   steps:["Un servidor generará una orden de cobro con importe y usuario verificados.","El jugador paga directamente en el formulario seguro del proveedor.","Un webhook firmado o consulta autorizada confirma el resultado; después se asigna el cupo."],
   note:"Culqi y Mercado Pago ofrecen pagos con tarjetas, sujetos a aprobación comercial, comisiones y posibles restricciones sobre torneos con premios."
  },
  cash:{
   name:"PagoEfectivo",symbol:"⌗",title:"PagoEfectivo · agentes y banca",subtitle:"Código CIP · Pendiente de configuración",
   description:"Una pasarela podrá generar un código CIP para pagar en agentes, bodegas o banca móvil. El código debe salir del servidor de pagos, no de este simulador.",
   steps:["Se genera un código CIP auténtico mediante el proveedor.","El jugador paga antes de la fecha de vencimiento indicada.","El proveedor notifica la confirmación y solo entonces se asegura el cupo."],
   note:"Los CIP pueden vencer. No se genera ningún CIP aquí ni se ha reservado un cupo real."
  },
  bank:{
   name:"Transferencia",symbol:"▥",title:"Transferencia bancaria",subtitle:"Cuenta autorizada · Verificación de abono",
   description:"Puede utilizarse como alternativa cuando el organizador cuente con una cuenta empresarial o personal autorizada para esta actividad, conforme a sus condiciones.",
   steps:["Se emite una referencia única asociada a la inscripción.","La persona realiza el abono en el canal bancario autorizado.","Se verifica el ingreso en la cuenta antes de confirmar el torneo."],
   note:"No se muestran números de cuenta. Los comprobantes pueden falsificarse y no se usarán como única validación."
  },
  wallet:{
   name:"Otras billeteras",symbol:"◉",title:"Otras billeteras digitales",subtitle:"Disponibilidad según contrato y pasarela",
   description:"Algunas pasarelas ofrecen otras billeteras y opciones de financiación. DROPZONE solo mostrará las que estén aprobadas para el negocio.",
   steps:["El jugador ve las billeteras realmente disponibles en el checkout.","El pago ocurre en el entorno seguro del proveedor correspondiente.","El servidor registra únicamente la confirmación de la operación."],
   note:"La variedad exacta de billeteras no está garantizada hasta completar la afiliación del comercio."
  }
 });
 const state={tournament:"solo",method:"yape",order:null};
 const sol=cent=>new Intl.NumberFormat("es-PE",{style:"currency",currency:"PEN"}).format(cent/100);
 function setMethod(key,focus=false){
  if(!Object.hasOwn(methods,key))return;
  state.method=key;
  document.querySelectorAll("[data-method]").forEach(button=>{
   const selected=button.dataset.method===key;
   button.classList.toggle("active",selected);
   button.setAttribute("aria-checked",String(selected));
   button.tabIndex=selected?0:-1;
   if(selected&&focus)button.focus();
  });
  const m=methods[key];
  $("method-symbol").textContent=m.symbol;
  $("method-title").textContent=m.title;
  $("method-subtitle").textContent=m.subtitle;
  $("method-description").textContent=m.description;
  $("provider-note").textContent=m.note;
  const steps=$("method-steps");steps.replaceChildren();
  m.steps.forEach(line=>{const li=document.createElement("li");li.textContent=line;steps.appendChild(li)});
  $("summary-method").textContent=m.name;
  clearOrder();
 }
 function setTournament(key){
  if(!Object.hasOwn(options,key))return;
  state.tournament=key;
  const t=options[key];
  $("summary-tournament").textContent=t.title;
  $("summary-entry").textContent=sol(t.amount);
  $("summary-total").textContent=sol(t.amount);
  clearOrder();
 }
 function clearOrder(){
  state.order=null;
  $("demo-confirmation").hidden=true;
 }
 function generate(){
  // Client-only demonstrator: no API request, no payment, no reservation.
  if(configuration.demoOnly!==true){
   $("demo-confirmation").hidden=false;
   $("demo-order-number").textContent="MODO DE PRUEBA NO DISPONIBLE";
   $("demo-order-note").textContent="El pago real requiere activación de servidor y pasarela habilitada.";
   return;
  }
  const t=options[state.tournament], m=methods[state.method];
  const nonce=typeof crypto!=="undefined"&&crypto.randomUUID
   ? crypto.randomUUID().slice(0,8).toUpperCase()
   : "SIN-CODIGO";
  const order="DEMO-"+nonce;
  state.order={order,tournament:t.title,method:m.name,cents:t.amount};
  $("demo-order-number").textContent=order;
  $("demo-order-note").textContent="Ejemplo de "+sol(t.amount)+" con "+m.name+". NO se cobró dinero, no existe una orden bancaria y NO se reservó un cupo.";
  $("demo-confirmation").hidden=false;
  $("demo-confirmation").scrollIntoView({behavior:"smooth",block:"nearest"});
 }
 function init(){
  if(configuration.demoOnly!==true){
   $("generate-demo-order").disabled=true;
   $("generate-demo-order").textContent="PAGOS NO ACTIVADOS";
   return;
  }
  $("demo-tournament").addEventListener("change",event=>setTournament(event.target.value));
  document.querySelectorAll("[data-method]").forEach(btn=>{
   btn.addEventListener("click",()=>setMethod(btn.dataset.method));
   btn.addEventListener("keydown",event=>{
    if(!["ArrowRight","ArrowLeft","ArrowDown","ArrowUp","Home","End"].includes(event.key))return;
    event.preventDefault();
    const keys=Object.keys(methods);
    const index=keys.indexOf(state.method);
    const next=event.key==="Home"?0:event.key==="End"?keys.length-1:
     (index+(["ArrowRight","ArrowDown"].includes(event.key)?1:-1)+keys.length)%keys.length;
    setMethod(keys[next],true);
   });
  });
  $("generate-demo-order").addEventListener("click",generate);
  setMethod(state.method);
  setTournament(state.tournament);
 }
 document.addEventListener("DOMContentLoaded",init);
})();