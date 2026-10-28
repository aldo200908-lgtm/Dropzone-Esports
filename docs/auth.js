/* DROPZONE ESPORTS — registro y acceso con Supabase Auth v2.
 * Aplicación estática: las políticas RLS de PostgreSQL deben aplicarse antes
 * de activar el registro real. Nunca se usa una service_role key en el navegador.
 */
"use strict";
(() => {
  const CONFIG = window.DROPZONE_SUPABASE || {};
  const page = document.body.dataset.authPage || "home";
  const elements = (selector) => document.querySelectorAll(selector);
  const get = (selector) => document.querySelector(selector);
  const base = new URL("./", window.location.href);
  const url = (file) => new URL(file, base).href;
  let client = null;
  let activeUser = null;

  function configured() {
    try {
      const endpoint = new URL(CONFIG.url || "");
      const key = CONFIG.publishableKey || "";
      return endpoint.protocol === "https:" &&
        key.length > 20 &&
        !/service_role|sb_secret_/i.test(key) &&
        typeof window.supabase?.createClient === "function";
    } catch { return false; }
  }

  function notice(text, kind = "info") {
    const target = get("#auth-message") || get("#profile-message");
    if (!target) return;
    target.textContent = text;
    target.dataset.kind = kind;
    target.hidden = false;
    target.setAttribute("role", kind === "error" ? "alert" : "status");
  }

  function translatedError(error) {
    const message = String(error?.message || "").toLowerCase();
    if (/invalid login credentials/.test(message)) return "Correo o contraseña incorrectos.";
    if (/email not confirmed/.test(message)) return "Confirma tu correo antes de iniciar sesión.";
    if (/already registered|user already registered/.test(message)) return "Este correo ya tiene una cuenta.";
    if (/rate limit|too many requests|email rate limit/.test(message)) return "Demasiados intentos. Vuelve a intentarlo más tarde.";
    if (/duplicate key|nickname/.test(message)) return "Este nickname ya está en uso. Elige otro.";
    if (/password/.test(message)) return "Revisa la contraseña: debe tener al menos 8 caracteres.";
    if (/fetch|network|failed to fetch/.test(message)) return "No pudimos conectar con Supabase. Revisa tu internet.";
    return "No pudimos completar la operación. Revisa los datos o inténtalo de nuevo.";
  }

  function setBusy(form, busy) {
    const button = form?.querySelector('button[type="submit"]');
    if (button) {
      button.disabled = busy;
      if (!button.dataset.original) button.dataset.original = button.textContent;
      button.textContent = busy ? "PROCESANDO..." : button.dataset.original;
    }
  }

  function setView(name) {
    elements("[data-auth-view]").forEach(panel => {
      const visible = panel.dataset.authView === name;
      panel.hidden = !visible;
    });
    elements("[data-select-view]").forEach(tab => {
      tab.setAttribute("aria-pressed", String(tab.dataset.selectView === name));
    });
    const message = get("#auth-message");
    if (message) message.hidden = true;
    if (page === "access") {
      const title = get("#auth-title");
      if (title) title.textContent = name === "register" ? "CREA TU CUENTA." : name === "forgot" ? "RECUPERA TU ACCESO." : name === "reset" ? "NUEVA CONTRASEÑA." : "ENTRA A LA ARENA.";
    }
  }

  function showDisabledState() {
    elements("form[data-requires-auth]").forEach(form => {
      form.querySelectorAll("input,button").forEach(el => { el.disabled = true; });
    });
    const info = get("#not-configured");
    if (info) info.hidden = false;
    if (page === "profile") notice("La autenticación todavía no está configurada. Vuelve cuando se active.", "error");
    if (page === "access") notice("Los formularios están preparados, pero todavía falta conectar Supabase. No podemos crear cuentas hasta entonces.", "info");
  }

  function applyNavUser(user) {
    const nav = get("#account-nav");
    if (!nav) return;
    nav.textContent = user ? "MI PERFIL" : "INGRESAR";
    nav.href = user ? url("perfil.html") : url("acceso.html");
  }

  function validNickname(value) {
    return /^[A-Za-z0-9_-]{3,24}$/.test(value);
  }
  function validUid(value) {
    return value === "" || /^[0-9]{1,30}$/.test(value);
  }

  async function getUser() {
    if (!client) return null;
    const { data, error } = await client.auth.getUser();
    if (error) return null;
    return data.user || null;
  }

  function bindActions() {
    elements("[data-select-view]").forEach(el => {
      el.addEventListener("click", () => setView(el.dataset.selectView));
    });

    const login = get("#login-form");
    login?.addEventListener("submit", async event => {
      event.preventDefault();
      if (!client) return;
      const form = event.currentTarget;
      const fd = new FormData(form);
      setBusy(form, true);
      try {
        const { error } = await client.auth.signInWithPassword({
          email: String(fd.get("email") || "").trim().toLowerCase(),
          password: String(fd.get("password") || "")
        });
        if (error) throw error;
        window.location.assign(url("perfil.html"));
      } catch (error) { notice(translatedError(error), "error"); }
      finally { setBusy(form, false); }
    });

    const register = get("#register-form");
    register?.addEventListener("submit", async event => {
      event.preventDefault();
      if (!client) return;
      const form = event.currentTarget;
      const fd = new FormData(form);
      const nickname = String(fd.get("nickname") || "").trim();
      const password = String(fd.get("password") || "");
      const confirm = String(fd.get("confirm_password") || "");
      if (!validNickname(nickname)) return notice("El nickname debe tener 3 a 24 caracteres: letras, números, _ o -.", "error");
      if (password.length < 8 || password.length > 128) return notice("La contraseña debe tener entre 8 y 128 caracteres.", "error");
      if (password !== confirm) return notice("Las contraseñas no coinciden.", "error");
      if (!get("#accept-rules")?.checked) return notice("Debes aceptar las reglas de la beta para registrarte.", "error");
      setBusy(form, true);
      try {
        const { data, error } = await client.auth.signUp({
          email: String(fd.get("email") || "").trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: url("perfil.html"),
            data: { nickname }
          }
        });
        if (error) throw error;
        form.reset();
        if (data.session) {
          notice("Cuenta creada. Ya puedes acceder a tu perfil.", "success");
          window.location.assign(url("perfil.html"));
        } else {
          notice("Si el registro fue aceptado, recibirás un mensaje para confirmar tu correo. Comprueba también la carpeta de spam.", "success");
        }
      } catch (error) { notice(translatedError(error), "error"); }
      finally { setBusy(form, false); }
    });

    const forgot = get("#forgot-form");
    forgot?.addEventListener("submit", async event => {
      event.preventDefault();
      if (!client) return;
      const form = event.currentTarget;
      setBusy(form, true);
      try {
        const email = String(new FormData(form).get("email") || "").trim().toLowerCase();
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: url("acceso.html?modo=restablecer")
        });
        if (error) throw error;
        notice("Si existe una cuenta con ese correo, llegará un enlace de recuperación.", "success");
        form.reset();
      } catch (error) { notice(translatedError(error), "error"); }
      finally { setBusy(form, false); }
    });

    const reset = get("#reset-form");
    reset?.addEventListener("submit", async event => {
      event.preventDefault();
      if (!client) return;
      const form = event.currentTarget;
      const fd = new FormData(form);
      const password = String(fd.get("password") || "");
      if (password.length < 8 || password.length > 128 || password !== fd.get("confirm_password")) {
        return notice("Verifica la contraseña (8 a 128 caracteres) y su confirmación.", "error");
      }
      setBusy(form, true);
      try {
        const user = await getUser();
        if (!user) throw new Error("Sesión inválida");
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        notice("Contraseña actualizada. Ya puedes entrar en tu perfil.", "success");
        history.replaceState({}, "", url("acceso.html"));
        setView("login");
        notice("Contraseña actualizada. Puedes iniciar sesión.", "success");
      } catch (error) { notice("El enlace venció o no se pudo cambiar la contraseña. Solicita otro enlace.", "error"); }
      finally { setBusy(form, false); }
    });

    const profile = get("#profile-form");
    profile?.addEventListener("submit", async event => {
      event.preventDefault();
      if (!client || !activeUser) return;
      const form = event.currentTarget;
      const fd = new FormData(form);
      const nickname = String(fd.get("nickname") || "").trim();
      const gameUid = String(fd.get("game_uid") || "").trim();
      if (!validNickname(nickname) || !validUid(gameUid)) {
        return notice("Nickname inválido o UID no numérico (máximo 30 dígitos).", "error");
      }
      setBusy(form, true);
      try {
        const { error } = await client.from("profiles")
          .update({ nickname, game_uid: gameUid || null, is_public: Boolean(fd.get("is_public")) })
          .eq("id", activeUser.id);
        if (error) throw error;
        const n = get("#welcome-name");
        if (n) n.textContent = nickname.toUpperCase();
        notice("¡Perfil actualizado correctamente!", "success");
      } catch (error) { notice(translatedError(error), "error"); }
      finally { setBusy(form, false); }
    });

    const logout = get("#logout-button");
    logout?.addEventListener("click", async () => {
      if (!client) return;
      logout.disabled = true;
      try {
        const { error } = await client.auth.signOut();
        if (error) throw error;
        window.location.replace(url("acceso.html"));
      } catch (error) {
        logout.disabled = false;
        notice("No se pudo cerrar la sesión. Vuelve a intentarlo.", "error");
      }
    });
  }

  async function loadProfile() {
    if (!client) return;
    const user = await getUser();
    activeUser = user;
    if (!user) {
      window.location.replace(url("acceso.html"));
      return;
    }
    applyNavUser(user);
    const email = get("#profile-email");
    if (email) email.textContent = user.email || "Correo no disponible";
    const { data, error } = await client.from("profiles")
      .select("nickname,game_uid,is_public,role,created_at")
      .eq("id", user.id).maybeSingle();
    const loading = get("#profile-loading");
    if (loading) loading.hidden = true;
    if (error || !data) {
      notice("No se pudo leer el perfil. Revisa que se ejecutó la migración SQL y las políticas RLS en Supabase.", "error");
      return;
    }
    const name = get("#welcome-name");
    if (name) name.textContent = String(data.nickname || "JUGADOR").toUpperCase();
    const nickInput = get("#profile-nickname");
    if (nickInput) nickInput.value = data.nickname || "";
    const uidInput = get("#profile-uid");
    if (uidInput) uidInput.value = data.game_uid || "";
    const publicInput = get("#profile-public");
    if (publicInput) publicInput.checked = Boolean(data.is_public);
    const role = get("#profile-role");
    if (role) role.textContent = data.role === "admin" ? "ADMINISTRADOR" : data.role === "moderator" ? "MODERADOR" : "JUGADOR";
    const content = get("#profile-content");
    if (content) content.hidden = false;
  }

  async function boot() {
    if (!configured()) { showDisabledState(); return; }
    client = window.supabase.createClient(CONFIG.url, CONFIG.publishableKey, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true, flowType: "implicit" }
    });
    bindActions();

    client.auth.onAuthStateChange((event, session) => {
      applyNavUser(session?.user || null);
      if (event === "PASSWORD_RECOVERY" && page === "access") {
        setView("reset");
        notice("Enlace de recuperación verificado. Crea tu nueva contraseña.", "success");
      }
    });

    const user = await getUser();
    applyNavUser(user);
    if (page === "profile") await loadProfile();
    if (page === "access") {
      const resetRequested = new URL(window.location.href).searchParams.get("modo") === "restablecer";
      const tokenType = new URLSearchParams(window.location.hash.slice(1)).get("type");
      if (resetRequested || tokenType === "recovery") {
        setView("reset");
        if (!user) notice("Enlace inválido o caducado. Solicita un nuevo correo de recuperación.", "error");
      } else {
        const requested = new URL(window.location.href).searchParams.get("modo");
        if (requested === "registro") setView("register");
        else setView("login");
        if (user) notice("Ya tienes una sesión iniciada. Puedes ir a tu perfil.", "success");
      }
    }
  }
  window.addEventListener("DOMContentLoaded", () => {
    boot().catch(error => {
      console.error("Auth initialization failed:", error?.message || "Unknown error");
      showDisabledState();
      notice("No se pudo iniciar el acceso. Revisa la conexión con Supabase.", "error");
    });
  });
})();
