# Fargo Connect · Panel de emisión

Dashboard web (React + Vite + TypeScript + Tailwind) para el flujo completo de
emisión de tarjetas sobre el backend Spring Boot `fargo-sdk-example`:

**Organización → Dispositivos → Perfil de producción → Trabajo de impresión**

## Requisitos

- Node.js 18+
- El backend `fargo-sdk-example` corriendo (por defecto en `http://localhost:8081`,
  ver `application.properties`)

## Arranque en desarrollo

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. El servidor de desarrollo de Vite hace *proxy* de
todas las rutas `/fargo-sdk-example/*` hacia `http://localhost:8081` (configurado
en `vite.config.ts`), así que no necesitas configurar CORS para desarrollo local.

Si tu backend corre en otro host/puerto, edita el `target` en `vite.config.ts`.

## Build de producción

```bash
npm run build
npm run preview
```

Para producción, sirve el contenido de `dist/` detrás del mismo dominio/reverse
proxy que expone el backend (por ejemplo, Nginx enrutando `/fargo-sdk-example/*`
al backend y todo lo demás a los archivos estáticos), o habilita CORS en el
backend Spring Boot si se sirven desde dominios distintos.

## Autenticación y roles

El portal ahora requiere iniciar sesión (`/login`). El token JWT se guarda en
`localStorage` y se envía como `Authorization: Bearer <token>` en cada
llamada. Un `401` de cualquier endpoint cierra la sesión automáticamente.

- **ADMIN** — ve todo, además de la página **Usuarios** para crear/deshabilitar
  cuentas.
- **OPERATOR** — ve Organizaciones, Dispositivos, Perfiles, Trabajos y Nuevo
  trabajo, sin gestión de usuarios.
- **CLIENT** — solo ve Perfiles, Trabajos y Nuevo trabajo, todo restringido a
  su propia organización (el backend hace cumplir esto; el frontend además
  oculta el paso de "elegir organización" en el asistente, ya que queda fija).

Necesitas al menos una cuenta `ADMIN` para crear las demás — el backend crea
una automáticamente en el primer arranque si no existe ninguna (ver
`PORTAL-SECURITY.md` en el proyecto del backend).

## Páginas

- **Resumen** — accesos directos a cada sección
- **Organizaciones** — lista + unidades organizacionales + ubicaciones
- **Dispositivos** — impresoras y destinos de impresión, filtrables por organización
- **Perfiles de producción** — lista + parámetros configurables de cada perfil
- **Trabajos** — búsqueda por periodo relativo o rango de fechas, detalle de trabajo
  y consulta de recursos de imagen
- **Nuevo trabajo** — asistente de 4 pasos: organización → perfil → parámetros
  (incluye carga de imágenes, convertidas a base64) → revisión de la
  `ProductionRequestTemplate` devuelta por el servidor → envío

## Sobre los tipos de datos

Los modelos reales (`Device`, `Organization`, `ProductionProfile`,
`ProductionProfileParameter`, `Job`, `ProductionRequestTemplate`, etc.) vienen del
SDK propietario `com.extensia.xcp.services:restapi`, cuyo código fuente no está
incluido en el proyecto backend. Los tipos en `src/api/types.ts` se infirieron de:

- Las firmas de los controladores (`DeviceController`, `JobController`, etc.)
- El código de mapeo comentado en `ProductionProfileController.java`, que revela
  los campos de `ProductionProfileParameter` (`name`, `dataType`, `required`,
  `defaultValue`, `value`, `options`, `validatorList`) y `Validator`
  (`type`, `pattern`, `min`, `max`)

Por eso cada tipo permite campos adicionales (`[key: string]: unknown`) y la UI
usa vistas JSON de respaldo (por ejemplo en el detalle de trabajo y en el paso
final del asistente) para no ocultar información si el SDK real trae más campos
de los aquí modelados. Si tienes acceso a los `.class`/javadocs del SDK, ajusta
`src/api/types.ts` para tipos exactos y quita las vistas JSON de respaldo donde
ya no se necesiten.

## ⚠️ Seguridad — acción requerida en el backend

`FargoConfiguration.java` (en el proyecto `fargo-sdk-example`, no en este
frontend) tiene hardcodeados en texto plano: una API key, la contraseña de los
certificados y los certificados PKCS#12 completos (auth + encryption) en
base64, más el certificado CA. Antes de desplegar cualquier app sobre este
backend:

1. Rota/revoca esos certificados y la API key con HID Fargo si este código ha
   estado en un repositorio o entorno no controlado.
2. Mueve esos secretos a variables de entorno o un vault; nunca al código
   fuente.
