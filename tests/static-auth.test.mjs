import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = (p) => readFileSync(join(root, p), "utf8");

test("GitHub Pages auth screens and local assets exist", () => {
  const access = file("docs/acceso.html");
  const profile = file("docs/perfil.html");
  const home = file("docs/index.html");
  for (const name of ["docs/site.js","docs/styles.css","docs/auth.js","docs/auth.css","docs/auth-config.js","docs/arena-shield.svg"]) {
    assert.equal(existsSync(join(root, name)), true, name);
  }
  for (const id of ["login-form","register-form","forgot-form","reset-form","accept-rules"]) {
    assert.match(access, new RegExp('id="' + id + '"'));
  }
  assert.match(access, /data-auth-page="access"/);
  assert.match(profile, /data-auth-page="profile"/);
  assert.match(profile, /id="profile-form"/);
  assert.match(profile, /id="logout-button"/);
  assert.match(home, /id="account-nav"/);
  assert.match(home, /href="\.\/acceso\.html"/);
});

test("Auth code contains necessary Supabase operations and fails closed without configuration", () => {
  const auth = file("docs/auth.js");
  for (const method of [
    "signUp(", "signInWithPassword(", "resetPasswordForEmail(",
    "updateUser(", "signOut(", "getUser(", 'from("profiles")'
  ]) assert.ok(auth.includes(method), "Missing " + method);
  assert.ok(auth.includes("showDisabledState()"));
  assert.ok(auth.includes("is_public"));
  assert.ok(auth.includes("data.session"));
  assert.ok(auth.includes("emailRedirectTo"));
});

test("Public auth config includes no privileged credentials", () => {
  const config = file("docs/auth-config.js");
  assert.match(config, /url:\s*""/);
  assert.match(config, /publishableKey:\s*""/);
  assert.doesNotMatch(config, /sb_secret_[A-Za-z0-9]{16,}/);
  assert.doesNotMatch(config, /eyJ[A-Za-z0-9_-]{100,}/);
});

test("Static auth SQL grants profile access with RLS from initial migration", () => {
  const initial = file("supabase/migrations/001_init.sql");
  const authGrant = file("supabase/migrations/004_static_auth.sql");
  assert.match(initial, /alter table public\.profiles enable row level security/i);
  assert.match(initial, /create policy "profiles read own or admin"/i);
  assert.match(authGrant, /grant select on public\.profiles to authenticated/i);
  assert.match(authGrant, /grant update \(nickname, game_uid, is_public\) on public\.profiles to authenticated/i);
});
