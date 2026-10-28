import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("Checkout is explicitly demo-only and has six payment methods",()=>{
 const html=read("docs/pagos.html");
 const js=read("docs/payments.js");
 const config=read("docs/payments-config.js");
 assert.match(html,/SIMULADOR · NO ENVÍES DINERO/);
 assert.match(html,/CREAR ORDEN DE PRUEBA/);
 assert.match(html,/id="payment-methods"/);
 for(const method of ["yape","plin","card","cash","bank","wallet"]){
  assert.match(html,new RegExp('data-method="'+method+'"'));
  assert.match(config,new RegExp('"'+method+'"'));
 }
 assert.match(config,/demoOnly: true/);
 assert.match(js,/if\(configuration\.demoOnly!==true\)/);
 assert.match(js,/NO se cobró dinero/);
});
test("Demo does not ask for or process payment credentials",()=>{
 const html=read("docs/pagos.html");
 const js=read("docs/payments.js");
 assert.doesNotMatch(html,/name="(?:card_number|cvv|password|token)"/i);
 assert.doesNotMatch(js,/fetch\(|XMLHttpRequest|createPayment|payment_intent|sb_secret|service_role/);
 assert.match(js,/document\.createElement\("li"\)/);
 assert.match(js,/textContent/);
 assert.match(html,/Ningún botón procesa pagos reales/);
});
test("Routes to payment demo are wired into main site, profile and community",()=>{
 const home=read("docs/index.html");
 const profile=read("docs/perfil.html");
 const community=read("docs/comunidad.html");
 for(const html of [home,profile,community])assert.match(html,/href="\.\/pagos\.html"/);
});
test("Preview does not confirm a cupo without verified payment",()=>{
 const html=read("docs/pagos.html");
 const js=read("docs/payments.js");
 assert.match(html,/Reserva confirmada/);
 assert.match(html,/<dd>NO<\/dd>/);
 assert.match(js,/NO se reservó un cupo/);
});
