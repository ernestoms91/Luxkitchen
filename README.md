## Requisitos

- `cross-env` instalado para setear variables de entorno en los scripts (compatible Windows/Linux/macOS).

Si usas Windows, asegúrate de correr los scripts con `cross-env` para evitar errores.

## Variables de Entorno

Este proyecto usa archivos `.env` para configurar variables según el entorno:

- `.env.development` — configuración para desarrollo
- `.env.production` — configuración para producción

⚠️ Nota importante:
La variable S3_BUCKET_NAME debe coincidir exactamente con el bucket creado previamente en MinIO o AWS S3.
Asegúrate de que el bucket tenga únicamente acceso público de lectura.

## Scripts npm

- `npm run start:dev` — corre la app en modo desarrollo (`.env.development`)
- `npm run start:prod` — corre la app en modo producción (`.env.production`)
- `npm run test` — corre tests con configuración `.env.test`

Estos scripts usan la variable de entorno `NODE_ENV` para seleccionar el `.env` correcto.



## 🔓 Configuración MinIO/S3 - Acceso Público a Imágenes

### Desarrollo o Producción (MinIO Docker)

**Hacer bucket público para servir imágenes:**

```bash
# Entrar al contenedor MinIO
docker exec -it <nombre_contenedor> sh

# Configurar alias y permisos públicos (solo lectura)
mc alias set minio <minio_url> <access_key> <secret_key>
mc anonymous set download minio/<bucket_name>

# Verificar
mc ls minio