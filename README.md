# Task Manager — AWS Lambda + DynamoDB + Vite

API REST serverless para gestión de tareas (todo list), desplegada en AWS con Terraform, con un frontend en React/Vite publicado en Vercel.

- **API en vivo:** https://97y80a3hu7.execute-api.us-east-1.amazonaws.com
- **Frontend en vivo:** https://aws-lambda-vite.vercel.app

Ver también:
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — diagrama y detalle de la infraestructura.
- [`RETROSPECTIVE.md`](./RETROSPECTIVE.md) — retrospectiva de cómo se construyó, decisiones y problemas encontrados.
- [`CLAUDE.md`](./CLAUDE.md) — especificación original del proyecto.

---

## Estructura del repo

```
.
├── lambda/          # Código de la API (Node.js 20.x, sin dependencias externas)
├── terraform/       # Infraestructura AWS (DynamoDB, Lambda, API Gateway, IAM)
└── frontend/        # SPA React + Vite + TypeScript + Tailwind
```

## Stack

| Capa | Tecnología |
|---|---|
| Infraestructura | Terraform (AWS provider ~5.0) |
| Backend | AWS Lambda (Node.js 20.x) + API Gateway HTTP API + DynamoDB |
| Frontend | React 18 + Vite 5 + TypeScript + Tailwind CSS v3 |
| Hosting frontend | Vercel |
| Control de versiones | GitLab (`origin`, self-hosted en `gitlab.codecrypto.academy`) + GitHub (mirror) |

---

## Backend

### Modelo de datos (DynamoDB)

Tabla `taskmanager-tasks`, partition key `id` (UUID v4), billing `PAY_PER_REQUEST`:

```json
{
  "id":          "uuid-v4",
  "title":       "string (requerido)",
  "description": "string (opcional)",
  "status":      "pending | in_progress | done",
  "createdAt":   "ISO 8601",
  "updatedAt":   "ISO 8601"
}
```

### Endpoints

| Método | Ruta | Operación | Respuestas |
|---|---|---|---|
| `GET` | `/tasks` | Listar todas las tareas | `200` |
| `POST` | `/tasks` | Crear tarea | `201`, `400` |
| `GET` | `/tasks/{id}` | Obtener tarea por ID | `200`, `404` |
| `PUT` | `/tasks/{id}` | Actualizar tarea | `200`, `400`, `404` |
| `DELETE` | `/tasks/{id}` | Eliminar tarea | `200` |

Todas las respuestas incluyen `Content-Type: application/json` y headers CORS (`Access-Control-Allow-Origin: *`).

### Despliegue de infraestructura

Requiere credenciales AWS configuradas (`~/.aws/credentials` o variables de entorno).

```bash
cd terraform
terraform init
terraform apply --auto-approve
```

El output `api_url` entrega la URL base del API.

### Probar la API

```bash
API_URL=$(cd terraform && terraform output -raw api_url)

# Listar tareas
curl "$API_URL/tasks"

# Crear tarea
curl -X POST "$API_URL/tasks" \
  -H "Content-Type: application/json" \
  -d '{"title":"Mi primera tarea","description":"Descripción opcional","status":"pending"}'

# Obtener tarea
curl "$API_URL/tasks/<id>"

# Actualizar tarea
curl -X PUT "$API_URL/tasks/<id>" \
  -H "Content-Type: application/json" \
  -d '{"status":"done"}'

# Eliminar tarea
curl -X DELETE "$API_URL/tasks/<id>"
```

> **Nota de arquitectura:** la especificación original pedía una Lambda Function URL pública. Se implementó así, pero devolvía `403 Forbidden` de forma persistente sin causa raíz identificable (ver `RETROSPECTIVE.md`). Se optó por un API Gateway HTTP API en su lugar, que no presenta ese problema.

---

## Frontend

### Funcionalidades

1. Listado de tareas con filtro por estado (Todas / Pendiente / En progreso / Completada)
2. Crear tarea (modal con título requerido, descripción y estado inicial)
3. Editar tarea (click en tarjeta abre modal pre-poblado)
4. Cambio rápido de estado (selector en la tarjeta)
5. Eliminar tarea (con confirmación)
6. Skeleton loaders y feedback de error
7. Diseño responsive (grid de 1 a 3 columnas)

### Variables de entorno

`frontend/.env.local`:

```
VITE_API_URL=<url del API Gateway>
```

### Desarrollo local

```bash
cd frontend
npm install
npm run dev
```

### Build

```bash
npm run build   # tsc -b && vite build
```

### Deploy en Vercel

El proyecto está linkeado a Vercel (`codecrypto/aws-lambda-vite`) y se deploya vía CLI, no vía integración Git (el repo vive en un GitLab self-hosted, no soportado por la integración nativa de Vercel):

```bash
cd frontend
npx vercel --prod
```

`VITE_API_URL` está configurada en Vercel para los entornos `production`, `preview` y `development` (`vercel env ls` para verlas, `vercel env add` para modificarlas).

---

## Orden de ejecución (de cero)

```
1. cd lambda && npm install (si se agregan dependencias)
2. cd terraform && terraform init && terraform apply --auto-approve
3. Probar la API con curl
4. cd frontend && npm install
5. Crear frontend/.env.local con VITE_API_URL
6. npm run dev — probar localmente
7. git push (a los remotos configurados)
8. cd frontend && npx vercel --prod
```

## Configuración AWS

- **Región:** `us-east-1` (`terraform/terraform.tfvars`)
- **Credenciales:** perfil local `~/.aws/credentials` o variables `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`
