## Requisitos

- `cross-env` instalado para setear variables de entorno en los scripts (compatible Windows/Linux/macOS).

Si usas Windows, asegúrate de correr los scripts con `cross-env` para evitar errores.


## Variables de Entorno

Este proyecto usa archivos `.env` para configurar variables según el entorno:

- `.env.development` — configuración para desarrollo
- `.env.production` — configuración para producción

## Scripts npm

- `npm run start:dev` — corre la app en modo desarrollo (`.env.development`)
- `npm run start:prod` — corre la app en modo producción (`.env.production`)
- `npm run test` — corre tests con configuración `.env.test`

Estos scripts usan la variable de entorno `NODE_ENV` para seleccionar el `.env` correcto.