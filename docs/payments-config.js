// DROPZONE ESPORTS · configuración pública del laboratorio de pagos.
// IMPORTANTE: "demoOnly" debe permanecer true hasta contar con autorización
// comercial, revisión de términos de Free Fire y pasarela real en servidor.
// Nunca introducir llaves privadas, cuentas bancarias ni secretos en GitHub Pages.
window.DROPZONE_PAYMENTS = Object.freeze({
  demoOnly: true,
  currency: "PEN",
  enabledMethods: ["yape","plin","card","cash","bank","wallet"]
});
