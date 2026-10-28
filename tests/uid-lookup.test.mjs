import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=path=>readFileSync(new URL("../"+path, import.meta.url),"utf8");
test("UID search page includes actual search and consent disclaimers",()=>{
 const html=read("docs/buscar-jugador.html");
 const js=read("docs/uid-lookup.js");
 assert.match(html,/id="uid-search-form"/);
 assert.match(html,/id="uid-result"/);
 assert.match(html,/autorizan aparecer/);
 assert.match(js,/lookup_dropzone_uid/);
 assert.match(js,/freefireLookupEnabled===true/);
 assert.match(js,/nickname registrado voluntariamente/i);
 assert.doesNotMatch(js,/document\.write\(/);
});
test("UID lookup SQL requires auth and public profile opt-in",()=>{
 const sql=read("supabase/migrations/005_uid_lookup.sql");
 assert.match(sql,/auth\.uid\(\)/);
 assert.match(sql,/p\.is_public = true/);
 assert.match(sql,/grant execute on function public\.lookup_dropzone_uid\(text\) to authenticated/i);
 assert.match(sql,/10 consultas|uses < 10/);
});
test("live provider is disabled by default and API key server-only",()=>{
 const config=read("docs/auth-config.js");
 const edge=read("supabase/functions/lookup-freefire/index.ts");
 assert.match(config,/freefireLookupEnabled: false/);
 assert.match(edge,/VOLSEVER_API_KEY/);
 assert.match(edge,/auth\.getUser\(\)/);
 assert.doesNotMatch(config,/pk_live_[A-Za-z0-9]+/);
});
