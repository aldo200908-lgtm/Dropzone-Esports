/* DROPZONE ESPORTS · WhatsApp sharing
 * Click-to-chat only: every message is chosen and sent by the user.
 * No WhatsApp private API, automation, or unapproved marketing messaging.
 */
"use strict";
(() => {
  const SITE = new URL("./index.html", window.location.href).href;
  const cfg = window.DROPZONE_WHATSAPP || {};
  const authCfg = window.DROPZONE_SUPABASE || {};
  const $ = id => document.getElementById(id);
  const formats = new Set(["invitacion","solo","escuadras","final","perfil","soporte"]);
  const number = typeof cfg.adminNumber === "string" && /^[1-9][0-9]{7,14}$/.test(cfg.adminNumber)
    ? cfg.adminNumber : "";
  let personal = null;

  function updateMessage() {
    const type = $("message-type").value;
    const isProfile = type === "perfil";
    const isSupport = type === "soporte";
    $("profile-options").hidden = !isProfile;
    let message = "";
    if (type === "solo") {
      message = "🎯 ¡Conoce el formato SOLO SURVIVOR de DROPZONE ESPORTS!\n\nEstamos preparando competiciones individuales de Free Fire. Todavía no hay inscripciones abiertas ni premios confirmados.\n\nMás información: " + SITE;
    } else if (type === "escuadras") {
      message = "⚔️ ¡Reúne a tu escuadra!\n\nDROPZONE ESPORTS está preparando el formato TEAM SHOWDOWN para equipos de Free Fire. Es una propuesta en desarrollo, todavía sin inscripciones abiertas.\n\nConoce el proyecto: " + SITE;
    } else if (type === "final") {
      message = "🏆 ¡Mira el formato CHAMPIONS NIGHT!\n\nDROPZONE ESPORTS prepara una futura final competitiva de Free Fire. Aún no hay fecha, clasificación ni premios confirmados.\n\nConoce el proyecto: " + SITE;
    } else if (isProfile) {
      if (personal) {
        message = "🎮 Soy " + personal.nickname + " y formo parte de DROPZONE ESPORTS.\n";
        if ($("include-uid").checked && personal.game_uid) message += "Mi UID de Free Fire: " + personal.game_uid + "\n";
        message += "\nConoce la comunidad y crea tu perfil: " + SITE;
      } else {
        message = "Inicia sesión en DROPZONE ESPORTS para preparar una invitación con tu nickname.";
      }
    } else if (isSupport) {
      message = "Hola, equipo de DROPZONE ESPORTS. 👋\n\nQuisiera hacer una consulta sobre los futuros torneos de Free Fire.\n\nMi pregunta es: ";
    } else {
      message = "🔥 ¡Únete a DROPZONE ESPORTS!\n\nEstamos construyendo una comunidad de torneos de Free Fire con perfiles de jugadores, formatos competitivos y futuros rankings.\n\nPuedes crear tu cuenta en nuestra web. Los torneos todavía no tienen inscripciones abiertas.\n\nCOMPITE. JUEGA. GANA. 🏆\n" + SITE;
    }
    $("message-preview").value = message;
    const link = $("whatsapp-share");
    const canSend = (!isProfile || Boolean(personal)) && (!isSupport || Boolean(number));
    const href = isSupport
      ? (number ? "https://wa.me/" + number + "?text=" + encodeURIComponent(message) : "")
      : "https://wa.me/?text=" + encodeURIComponent(message);
    if (canSend) {
      link.href = href;
      link.removeAttribute("aria-disabled");
      link.textContent = isSupport ? "CONSULTAR POR WHATSAPP ↗" : "ABRIR WHATSAPP ↗";
      link.tabIndex = 0;
    } else {
      link.removeAttribute("href");
      link.setAttribute("aria-disabled","true");
      link.tabIndex = -1;
      link.textContent = isSupport ? "SIN NÚMERO DE CONTACTO" : "INICIA SESIÓN";
    }
    $("copy-message").disabled = isProfile && !personal;
    const status = $("comms-status");
    status.textContent = isSupport && !number
      ? "El WhatsApp oficial todavía no está configurado. Puedes copiar el mensaje para usarlo después."
      : isProfile && !personal
        ? "Para compartir tu nickname, primero inicia sesión."
        : "";
  }

  function setChannels() {
    const support = $("support-link");
    if (number) {
      support.href = "https://wa.me/" + number + "?text=" + encodeURIComponent("Hola, DROPZONE ESPORTS. Tengo una consulta sobre sus torneos.");
      support.target = "_blank";
      support.rel = "noopener noreferrer";
      support.removeAttribute("aria-disabled");
      support.textContent = "HABLAR POR WHATSAPP ↗";
      $("support-badge").textContent = "CONTACTO DISPONIBLE";
      $("support-badge").classList.add("status-live");
      $("support-description").textContent = "Abre el chat con el WhatsApp oficial de DROPZONE para resolver dudas.";
    } else {
      support.removeAttribute("href");
      support.addEventListener("click", event => event.preventDefault());
    }
    const group = $("group-link");
    try {
      const url = new URL(cfg.groupInviteUrl || "");
      if (url.protocol === "https:" && url.hostname === "chat.whatsapp.com" && /^\/[A-Za-z0-9_-]{8,}$/.test(url.pathname)) {
        group.href = url.href;
        group.target = "_blank";
        group.rel = "noopener noreferrer";
        group.removeAttribute("aria-disabled");
        group.textContent = "UNIRME AL GRUPO ↗";
        $("group-badge").textContent = "ENLACE DISPONIBLE";
        $("group-badge").classList.add("status-live");
      }
    } catch { /* No hay grupo oficial configurado todavía. */ }
    if (group.getAttribute("aria-disabled") === "true") {
      group.removeAttribute("href");
      group.addEventListener("click", event => event.preventDefault());
    }
  }

  async function loadProfile() {
    if (!authCfg.url || !authCfg.publishableKey || typeof window.supabase?.createClient !== "function") {
      $("profile-info-name").textContent = "Conexión no disponible";
      $("profile-info-hint").textContent = "Prueba de nuevo o comparte una invitación general.";
      return;
    }
    try {
      const client = window.supabase.createClient(authCfg.url,authCfg.publishableKey);
      const {data:{user},error:userError} = await client.auth.getUser();
      if (userError || !user) {
        $("profile-info-name").textContent = "No has iniciado sesión";
        $("comms-login-link").hidden = false;
        updateMessage();
        return;
      }
      const {data,error} = await client.from("profiles").select("nickname,game_uid").eq("id",user.id).maybeSingle();
      if (error || !data || !data.nickname) {
        $("profile-info-name").textContent = "Perfil no disponible";
        $("profile-info-hint").textContent = "Revisa tus datos en Mi perfil.";
        return;
      }
      personal = {nickname:String(data.nickname).slice(0,24),game_uid:data.game_uid?String(data.game_uid).slice(0,30):""};
      $("profile-info-name").textContent = personal.nickname;
      $("profile-info-hint").textContent = personal.game_uid
        ? "Tu UID solo se incluirá si marcas la casilla."
        : "Aún no guardas un UID; podrás compartir solo tu nickname.";
      updateMessage();
    } catch {
      $("profile-info-name").textContent = "No pudimos consultar tu perfil";
      $("profile-info-hint").textContent = "Comprueba tu conexión o inicia sesión otra vez.";
    }
  }

  async function copyMessage() {
    const message = $("message-preview").value;
    const status = $("comms-status");
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
      } else {
        $("message-preview").focus();
        $("message-preview").select();
        if (!document.execCommand("copy")) throw new Error("Copy unavailable");
      }
      status.textContent = "Mensaje copiado. Puedes pegarlo en el chat que quieras.";
    } catch {
      status.textContent = "No se pudo copiar automáticamente. Selecciona y copia el texto de arriba.";
    }
  }

  function start() {
    const params = new URLSearchParams(window.location.search);
    const preset = params.get("formato") || (params.get("accion") === "perfil" ? "perfil" : "invitacion");
    $("message-type").value = formats.has(preset) ? preset : "invitacion";
    $("message-type").addEventListener("change",updateMessage);
    $("include-uid").addEventListener("change",updateMessage);
    $("copy-message").addEventListener("click",copyMessage);
    setChannels();
    updateMessage();
    loadProfile();
  }
  document.addEventListener("DOMContentLoaded",start);
})();
