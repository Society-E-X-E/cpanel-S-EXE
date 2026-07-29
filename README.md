# cpanel-S-EXE
C-Panel Dashboard V-3.0.1

## Objetivo del proyecto
Este repositorio está orientado a funcionar como un C-Panel propio para gestión de flujos de autenticación, monitoreo de solicitudes y administración de usuarios.

## Cambios recientes
- Se eliminó la dependencia visual directa con la marca de Bancolombia de la interfaz principal.
- Se consolidó una capa de UI compartida para autenticación, carga y panel de administración.
- Se dejó una base más limpia para evolucionar el proyecto hacia un producto propio.

## Estructura principal
- app/: páginas y componentes de la interfaz Next.js
- pages/api/: endpoints del backend interno
- lib/: lógica de autenticación, base de datos y notificaciones
- __tests__/: pruebas del flujo principal
