# Society . E X E Dashboard

Panel privado para gestionar las cuentas del equipo, los perfiles y el estado general de Society . E X E y OTP-X.

## Requisitos

- Node.js 20 o superior
- SQLite (incluido mediante `better-sqlite3`)

## Inicio local

1. Instala dependencias con `npm ci`.
2. Copia `.env.example` a `.env.local`.
3. Configura `JWT_SECRET` con un valor aleatorio de al menos 32 caracteres. Puedes generarlo con `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.
4. Define `OWNER_USERNAME`, `OWNER_PASSWORD` (mínimo 12 caracteres) y, opcionalmente, `OWNER_EMAIL`. Esos valores crean la cuenta Owner solo cuando la tabla del equipo todavía no tiene un Owner.
5. Ejecuta `npm run dev` y abre `http://localhost:3000`.

La base de datos local se crea en `data/app.db`. No publiques `.env.local` ni archivos de base de datos.

## Roles

| Rol | Permisos |
| --- | --- |
| Owner · CTO | Acceso total y asignación de roles. |
| CEO | Administración del equipo, excepto cuentas y rol Owner. |
| Administrador | Administración de moderadores; no puede asignar otros rangos. |
| Moderador | Acceso al dashboard y su perfil. El alcance de edición de textos requiere integrar el CMS del sitio, que no existe en este repositorio. |

La API valida permisos en el servidor; ocultar controles en la interfaz no sustituye la autorización.

## Perfiles y analítica

Cada miembro puede editar su nombre de usuario, correo, teléfono, foto mediante una URL HTTPS, biografía y enlaces públicos a GitHub, GitLab, LinkedIn, Google y X. Estos enlaces no son autenticación OAuth; no se almacenan tokens de proveedores.

La portada no inventa métricas. Los datos de visitas y disponibilidad aparecen como no conectados hasta configurar una fuente autorizada de analítica. No se capturan contraseñas, OTP ni datos bancarios de visitantes.

La información técnica y de propiedad intelectual de OTP-X debe manejarse según los acuerdos de confidencialidad aplicables. El dashboard muestra solo información general; no publicar material confidencial en perfiles, métricas o registros.

## Verificación

- `npm test`
- `npm run build`
