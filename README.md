# DROPZONE ESPORTS

Plataforma de torneos competitivos, inicialmente Free Fire. **Versión beta sin pagos reales.**

## Stack
Next.js 16 (App Router), TypeScript, Tailwind 4, Supabase Auth/Postgres y Vercel.

## Inicio
1. Instala Node.js 22 o superior y ejecuta `npm install`.
2. Crea un proyecto Supabase y ejecuta en orden `supabase/migrations/001_init.sql` y `supabase/migrations/002_leaderboard_periods.sql` y `supabase/migrations/003_reconciliation.sql` en el SQL Editor.
3. Copia `.env.example` a `.env.local`, configura la URL y clave pública de Supabase.
4. Ejecuta `npm run dev`.
5. Registra una cuenta; para habilitar administración, desde SQL Editor ejecuta:
   `update public.profiles set role='admin' where id=(select id from auth.users where email='TU_EMAIL');`
   Esto debe hacerse únicamente por el propietario autorizado desde el panel SQL seguro.
6. Publica en Vercel y configura las mismas variables de entorno.

Sin configuración de Supabase, la web muestra una **vista previa claramente marcada**, pero el registro y las reservas se deshabilitan. No hay cobros.

## Funciones
- Inicio con identidad esports y torneos destacados.
- Catálogo y detalles de torneos conectados a Supabase.
- Autenticación y perfil con UID.
- Reservas atómicas con cupos, mínimo, máximo, vencimiento y lista de espera.
- Panel administrativo de torneos y resultados.
- Tabla de clasificación calculada con resultados aprobados.
- Credenciales de sala privadas según autorización y ventana de acceso.
- Migración con RLS, auditoría y reglas de datos.

## Configuración
- Rellenar URL y clave anon/public de Supabase.
- Definir `NEXT_PUBLIC_SITE_URL` para callbacks.
- En Supabase Auth, configurar URLs de redirección: http://localhost:3000/auth/callback y dominio desplegado + /auth/callback.
- Habilitar verificación de correo para usuarios reales.
- Para lanzar torneos, un administrador crea torneos desde /admin.
- Las funciones de pago solo son simulaciones de margen; jamás confirman pagos.

## Comprobación
`npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`.

## Límites y seguridad
- En la beta los torneos pueden ser gratuitos; el precio de inscripción es informativo y cobro real **no está implementado**. Para evitar confusiones, el formulario bloquea reservas pagadas.
- Las salas NO se crean ni controlan automáticamente dentro de Free Fire.
- No usar imágenes ni marcas registradas sin autorización. DROPZONE ESPORTS no está afiliado a Garena.
- Verificar términos de Garena, menores, privacidad y normativa peruana antes de habilitar pagos.
- No declarar que un premio está asegurado hasta contar con fondos disponibles.

## Cierre de inscripciones y automatización
- En /admin existe un botón para revisar torneos cuya fecha límite venció.
- `supabase/migrations/003_reconciliation.sql` define la rutina de conciliación. Torneos con menos del mínimo pasan a "cancelled"; el cambio genera notificaciones.
- Para automatizarla, programa un GET a `/api/cron/reconcile` desde un proveedor de cron autorizado, incluyendo `Authorization: Bearer <CRON_SECRET>`.
- Define `CRON_SECRET` y `SUPABASE_SERVICE_ROLE_KEY` solo en variables privadas del servidor (no prefijo NEXT_PUBLIC).
- Frecuencia sugerida: cada 5 minutos, si el proveedor contratado lo permite. Mientras no haya un programador conectado, el cierre es **manual**.


## Registro e inicio de sesión SIN Vercel (GitHub Pages + Supabase)

Las páginas `docs/acceso.html` y `docs/perfil.html` funcionan con **Supabase Auth directamente en el navegador**. No requieren un servidor Next.js. Hasta completar esta configuración, muestran que la autenticación aún no está activa (sin fingir registros).

### Activación (una sola vez)

1. Crea un proyecto en [Supabase](https://supabase.com/dashboard), una vez que puedas gestionar legalmente la plataforma.
2. En el **SQL Editor** ejecuta los scripts de la carpeta `supabase/migrations` en orden: `001_init.sql`, `002_leaderboard_periods.sql`, `003_reconciliation.sql` y `004_static_auth.sql`.
3. Abre en GitHub `docs/auth-config.js` y rellena:
   - `url`: la **Project URL** (configurada para el proyecto DROPZONE ESPORTS: `https://qriscpebpkmmermujrmu.supabase.co`)
   - `publishableKey`: la clave **publishable** `sb_publishable_...` o clave pública **anon** (no la `service_role` ni una clave secreta).
4. En **Authentication → URL Configuration**:
   - **Site URL**: `https://aldo200908-lgtm.github.io/Dropzone-Esports/`
   - **Redirect URLs** (agrega ambas):
     `https://aldo200908-lgtm.github.io/Dropzone-Esports/perfil.html`
     `https://aldo200908-lgtm.github.io/Dropzone-Esports/acceso.html?modo=restablecer`
5. En **Authentication → Providers → Email** habilita autenticación por correo y **confirmación de correo**. Para un servicio público configura un envío SMTP adecuado, límites de envíos y protección contra automatizaciones.
6. Espera a que se publique la actualización de GitHub Pages. Visita [Acceso](https://aldo200908-lgtm.github.io/Dropzone-Esports/acceso.html) y comprueba con una cuenta de prueba autorizada: registro → correo de confirmación → login → perfil → UID → cerrar sesión → restablecer contraseña.

### Seguridad
- El frontend nunca debe contener `service_role`, `sb_secret_`, tokens personales ni contraseñas.
- La `publishableKey` está diseñada para ser pública. Las **políticas RLS** son las que protegen los datos.
- Los usuarios pueden modificar solo su propio perfil; los roles no se cambian desde el navegador.
- Los datos privados del perfil no se muestran públicamente por defecto.
- La recopilación de datos, la edad de los jugadores, los términos de uso y la política de privacidad deben revisarse antes de lanzar el registro al público.
- La web pública sigue sin admitir inscripciones a torneos, premios garantizados ni cobros.

### Diagnóstico
Si el botón de registro no funciona, revisa:
- Que `docs/auth-config.js` contiene la URL y la clave **pública** correctas.
- Que ejecutaste las cuatro migraciones SQL sin errores.
- Que las Redirect URLs coinciden exactamente con las páginas de GitHub Pages.
- Que no bloqueas jsDelivr y el navegador permite JavaScript.
- Que Supabase Auth no está limitando el envío de correos en la cuota gratuita.

La aplicación Next.js en la raíz del repositorio es otro frontend opcional y **no se ejecuta desde GitHub Pages**. Para este MVP la página estática + Supabase es suficiente.

## Vista pública sin Vercel (GitHub Pages)
Se incluye `docs/index.html`, una página de presentación estática, responsive y sin funciones de pago ni inscripción.

Para publicarla por primera vez, en GitHub abre **Settings → Pages → Build and deployment**, elige **Deploy from a branch** → rama **main** → carpeta **/docs** → **Save**.

GitHub Pages publica la web estática en:
https://aldo200908-lgtm.github.io/Dropzone-Esports/

**Importante:** GitHub Pages no ejecuta Next.js Server Actions ni Supabase SSR. La aplicación Next.js completa requiere hosting de servidor compatible (Vercel no es obligatorio: puede ser otra plataforma Next.js o un servidor Node.js).

## Buscar nickname por UID (GitHub Pages + Supabase)
Página: `docs/buscar-jugador.html`. Consulta gratuita para usuarios registrados que hayan permitido aparecer públicamente.

**Activación del buscador interno:**
1. Abrir `supabase/migrations/005_uid_lookup.sql`, pegarlo en SQL Editor de DROPZONE y ejecutar Run.
2. Un jugador debe iniciar sesión, guardar su UID en Mi perfil y marcar *Mostrar mi nickname en rankings públicos*.
3. Otro jugador conectado podrá introducir ese UID en Buscar jugador para ver el nickname de DROPZONE. Un usuario privado nunca aparecerá.
4. **El resultado es un nickname autodeclarado de DROPZONE, NO el nickname oficial de Free Fire**.

**Consulta opcional del nickname de Free Fire (proveedor externo no oficial):**
- Código preparado: `supabase/functions/lookup-freefire/index.ts` (Supabase Edge Function).
- Debes elegir un proveedor autorizado. El ejemplo usa Volsever, que requiere API key propia y puede tener cargos por consulta. Evalúa sus términos, disponibilidad para Perú/SAC y los de Garena antes de activar.
- Implementación de ejemplo: crea la Edge Function `lookup-freefire`, pega `index.ts` y despliega con verificación JWT del gateway desactivada (**verify_jwt=false**), pues el código valida tokens de usuario con `auth.getUser()`.
- Configura la clave únicamente como secreto de servidor `VOLSEVER_API_KEY` en Supabase. **Nunca** la pongas en `docs/auth-config.js` ni en GitHub.
- Activa `freefireLookupEnabled: true` en `docs/auth-config.js` solo después de probar con un UID real que el proveedor tiene cobertura.
- La función exige inicio de sesión y limita a 10 consultas/hora por usuario (migración 005). Cachea respuestas 24 horas.
- La consulta externa muestra el nickname **reportado por ese proveedor**, no una prueba de titularidad de la cuenta ni una conexión oficial con Garena.

## Comunidad + WhatsApp (GitHub Pages, sin API de pago)
- **Página:** `docs/comunidad.html`. Conecta la web con WhatsApp mediante enlaces públicos `https://wa.me/?text=...` del Centro de ayuda oficial de WhatsApp.
- Compartir enlace de la web, formatos de ejemplo (identificados como *no abiertos*), o tu nickname registrado en DROPZONE.
- El UID del jugador **solo** se añade si él marca voluntariamente la casilla al compartir su propio perfil. No se exponen contraseñas ni sesiones.
- Abrir WhatsApp **no** envía un mensaje automáticamente. El usuario selecciona un contacto/grupo y pulsa Enviar.
- Para activar soporte directo, edita `docs/comms-config.js` y configura `adminNumber: "51XXXXXXXXX"` con un número autorizado de WhatsApp Business, sin el símbolo `+`. Nunca publiques un número privado sin permiso.
- Para activar el acceso al grupo, pega el enlace de invitación que administres en `groupInviteUrl` (host `chat.whatsapp.com`). Sin enlace configurado, el botón permanece desactivado.
- **Notificaciones automáticas:** no implementadas. Requieren WhatsApp Business Platform/Cloud API en un servidor seguro, consentimiento del destinatario y, según el tipo de conversación, plantillas aprobadas y cobros.
- No se gestionan inscripciones, mensajes entrantes o claves de salas por WhatsApp. Eso necesitará un backend y controles de acceso.

## Pagos multimedio — interfaz DEMO y arquitectura futura (sin cobros)

**Interfaz publicada:** `docs/pagos.html` y recursos `docs/payments.js`, `docs/payments.css`, `docs/payments-config.js`.
- Selector de **seis métodos**: Yape, Plin, tarjetas, PagoEfectivo, transferencia bancaria y otras billeteras.
- Los ejemplos S/2, S/3 y S/5 son **ilustrativos**: no anuncian precios, torneos reales ni premios.
- El botón `CREAR ORDEN DE PRUEBA` genera solo un identificador `DEMO-...` en el navegador, sin persistencia, sin procesar cargos, sin reservar plazas.
- `demoOnly: true` impide confundir la vista con un checkout real. **No** cambiar el flag para cobrar: antes hace falta un backend transaccional probado y aceptación comercial.
- NUNCA incorporar llaves secretas, números bancarios privados, información sensible de tarjetas o pasarelas con tokens de producción en el frontend.

### Activación real — pendiente de autorización

1. Confirmar elegibilidad del negocio y responsable contractual habilitado, aceptación de torneos de entrada pagada y premios por el procesador (Culqi, Mercado Pago u otro) y condiciones de Free Fire y normativa aplicable en Perú.
2. Configurar una pasarela multipago: CulqiOnline documenta Visa/Mastercard/Amex/Diners, Yape y PagoEfectivo; Plin y transferencias podrían manejarse por otras integraciones autorizadas. No presumir Plin directo en CulqiOnline. Comparar tarifas mínimas, sobre todo para S/2-S/3.
3. Crear **orden real del lado servidor** con importe calculado desde `public.tournaments.entry_cents`, usuario autenticado, inscripción/tournament ID, expiración y clave única de idempotencia; no confiar en precios del navegador.
4. Proteger cupos con transacciones atómicas, definir reservas temporales y liberación si la orden no se paga. La función `reserve_free_tournament` de `001_init.sql` **rechaza torneos pagados**: no se debe reutilizar para acreditarlos.
5. Verificar pago del lado servidor mediante webhook autenticado + consulta al proveedor, evitando duplicados, monto o moneda alterados, y asociar irrevocablemente una referencia de proveedor a la orden de un solo jugador.
6. Confirmar inscripción **solamente tras verificación** y notificar en el perfil; casos de pago fallido, expirado, reclamo, reembolso y contracargo deben tener estado independiente.
7. Proteger la ruta de administración con Auth y RLS/roles, nunca con solo una contraseña en JS; registrar auditoría de aprobaciones manuales y transferencias. Un screenshot no es comprobante suficiente.

**Estado del proyecto:** ninguna cuenta mercantil, webhook o cobro está integrado. El simulador no mueve dinero.
