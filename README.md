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
