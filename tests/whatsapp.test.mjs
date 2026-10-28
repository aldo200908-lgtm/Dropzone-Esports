import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const file=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("Community page has voluntary WhatsApp sharing, local assets and profile opt-in",()=>{
 const html=file("docs/comunidad.html");
 for(const filePath of ["./comms-config.js","./whatsapp.js","./whatsapp.css"]){
  assert.ok(html.includes('src="'+filePath+'"')||html.includes('href="'+filePath+'"'),filePath);
 }
 assert.match(html,/id="whatsapp-share"/);
 assert.match(html,/id="include-uid"/);
 assert.match(html,/id="message-preview"/);
 assert.match(html,/Nada se envía sin tu confirmación/);
});
test("No outbound WhatsApp messages; only user-invoked click-to-chat",()=>{
 const js=file("docs/whatsapp.js");
 assert.match(js,/https:\/\/wa\.me\/\?text=/);
 assert.match(js,/https:\/\/wa\.me\/.*\?text=/);
 assert.match(js,/encodeURIComponent\(message\)/);
 assert.match(js,/\$\("include-uid"\)\.checked/);
 assert.match(js,/\$\("message-type"\)\.addEventListener\("change"/);
 assert.doesNotMatch(js,/fetch\(.*graph\.facebook\.com/);
 assert.doesNotMatch(js,/service_role|sb_secret_/);
});
test("WhatsApp support is disabled without a configured number or group invite link",()=>{
 const config=file("docs/comms-config.js");
 const js=file("docs/whatsapp.js");
 assert.match(config,/adminNumber: ""/);
 assert.match(config,/groupInviteUrl: ""/);
 assert.match(js,/aria-disabled/);
 assert.match(js,/chat\.whatsapp\.com/);
 assert.match(js,/\[1-9\]\[0-9\]\{7,14\}/);
});
test("Main site exposes community routes while preserving existing tournament disclaimers",()=>{
 const home=file("docs/index.html");
 const profile=file("docs/perfil.html");
 for(const value of ["./comunidad.html","./comunidad.html?formato=solo","./comunidad.html?formato=escuadras","./comunidad.html?formato=final"]){
  assert.ok(home.includes(value),value);
 }
 assert.match(profile,/comunidad\.html\?accion=perfil/);
 assert.match(home,/Inscripciones a torneos y pagos desactivados/);
});
