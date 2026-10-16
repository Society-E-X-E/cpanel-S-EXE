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

## Perfiles, OAuth y fotos

Cada miembro puede editar su nombre de usuario, correo, teléfono y biografía. Las fotos de perfil se cargan como archivos JPEG, PNG o WebP (máximo 3 MB) y se guardan en Cloudinary; el servidor valida su firma y aplica una transformación de tamaño.

Las cuentas de GitHub, GitLab, LinkedIn, Google y X se conectan mediante OAuth. El panel solicita solo identidad básica (sin permisos para publicar o modificar contenido), usa PKCE y protege el estado de autorización. Los tokens de acceso se cifran en la base de datos con `OAUTH_TOKEN_ENCRYPTION_KEY` y nunca se envían al navegador. Desconectar elimina el token local; para revocar el permiso concedido, también hay que hacerlo desde los ajustes de aplicaciones autorizadas del proveedor.

Para habilitar estas funciones, configura en `.env.local`:

- `APP_BASE_URL`: origen exacto del dashboard (por ejemplo, `http://localhost:3000` en local y `https://society-exe.site` en producción). En producción debe usar HTTPS.
- `OAUTH_TOKEN_ENCRYPTION_KEY`: secreto aleatorio de al menos 32 caracteres. No lo cambies sin planificar la renovación de los tokens almacenados.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET`.
- El par `*_CLIENT_ID` y `*_CLIENT_SECRET` de cada proveedor que quieras activar. Registra como URL de callback `{APP_BASE_URL}/api/admin/oauth/{provider}`, sustituyendo `{provider}` por `github`, `gitlab`, `linkedin`, `google` o `x`.

Guarda secretos únicamente en el entorno privado del servidor; no los publiques en el repositorio ni los compartas en el navegador. Las conexiones pueden dejarse sin configurar y no aparecerán habilitadas en el perfil.

## Analítica

Cada miembro puede editar su nombre de usuario, correo, teléfono, foto mediante una URL HTTPS, biografía y enlaces públicos a GitHub, GitLab, LinkedIn, Google y X. Estos enlaces no son autenticación OAuth; no se almacenan tokens de proveedores.

La portada no inventa métricas. Los datos de visitas y disponibilidad aparecen como no conectados hasta configurar una fuente autorizada de analítica. No se capturan contraseñas, OTP ni datos bancarios de visitantes.

La información técnica y de propiedad intelectual de OTP-X debe manejarse según los acuerdos de confidencialidad aplicables. El dashboard muestra solo información general; no publicar material confidencial en perfiles, métricas o registros.

## Verificación

- `npm test`
- `npm run build`
