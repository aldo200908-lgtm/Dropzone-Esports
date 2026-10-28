# DROPZONE ESPORTS

Plataforma de torneos competitivos, inicialmente Free Fire. **Versión beta sin pagos reales.**

## Stack
Next.js 16 (App Router), TypeScript, Tailwind 4, Supabase Auth/Postgres y Vercel.

## Inicio
1. Instala Node.js 22 o superior y ejecuta `npm install`.
2. Crea un proyecto Supabase y ejecuta en orden `supabase/migrations/001_init.sql` y `supabase/migrations/002_leaderboard_periods.sql` en el SQL Editor.
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
