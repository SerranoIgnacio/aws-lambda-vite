# Proyecto: Task Manager — AWS Lambda + DynamoDB + Vite

## Resumen

API REST serverless para gestión de tareas (todo list), desplegada en AWS con Terraform. Frontend profesional en React/Vite conectado al API, publicado en Vercel.

---

## 1. Infraestructura Terraform

### Recursos a crear

| Recurso | Nombre | Descripción |
|---|---|---|
| `aws_dynamodb_table` | `tasks` | Tabla de tareas |
| `aws_iam_role` | `lambda_exec_role` | Rol de ejecución de Lambda |
| `aws_iam_role_policy` | `lambda_dynamodb_policy` | Permisos DynamoDB sobre el rol |
| `aws_lambda_function` | `tasks_api` | Función Lambda (Node.js 20.x) |
| `aws_lambda_function_url` | `tasks_api_url` | URL pública de la Lambda (CORS habilitado) |

### DynamoDB — Modelo de datos

**Tabla:** `tasks`

| Atributo | Tipo | Rol |
|---|---|---|
| `id` | `String` | Partition Key (UUID v4) |

**Atributos adicionales** (no-schema, almacenados en cada ítem):

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

Billing mode: `PAY_PER_REQUEST`.

### Lambda

- **Runtime:** `nodejs20.x`
- **Handler:** `index.handler`
- **Código fuente:** `./lambda/` (empaquetado como ZIP por Terraform con `archive_file`)
- **Variables de entorno:**
  - `TABLE_NAME` → nombre de la tabla DynamoDB
  - `REGION` → región AWS
- **Permisos IAM mínimos sobre DynamoDB:**
  - `dynamodb:PutItem`
  - `dynamodb:GetItem`
  - `dynamodb:UpdateItem`
  - `dynamodb:DeleteItem`
  - `dynamodb:Scan`

### Lambda Function URL

- `authorization_type = "NONE"` (acceso público)
- CORS configurado para aceptar cualquier origen (`*`) durante desarrollo

### Archivos Terraform

```
terraform/
├── main.tf          # Provider AWS, recursos principales
├── variables.tf     # Variables: region, prefix
├── outputs.tf       # Output: lambda_url
└── terraform.tfvars # region = "us-east-1"
```

---

## 2. Lambda — API REST

### Endpoints

| Método | Ruta | Operación |
|---|---|---|
| `GET` | `/tasks` | Listar todas las tareas (Scan) |
| `POST` | `/tasks` | Crear tarea nueva |
| `GET` | `/tasks/{id}` | Obtener tarea por ID |
| `PUT` | `/tasks/{id}` | Actualizar tarea |
| `DELETE` | `/tasks/{id}` | Eliminar tarea |

### Routing

La Lambda recibe eventos de tipo `LambdaFunctionURLRequestEvent`. El routing se resuelve por `requestContext.http.method` y `rawPath`.

### Respuestas

- `200` con body JSON para operaciones exitosas
- `201` al crear un recurso nuevo
- `404` si el ítem no existe
- `400` para body inválido o campos requeridos ausentes
- `405` para método no soportado
- `500` para errores internos

Todos los responses incluyen header `Content-Type: application/json` y los headers CORS necesarios.

### Estructura del código Lambda

```
lambda/
├── index.mjs        # Handler principal + router
├── db.mjs           # Cliente DynamoDB (DocumentClient)
├── tasks.mjs        # CRUD operations
└── package.json     # Sin dependencias externas (usa AWS SDK v3 nativo)
```

---

## 3. Testing

### Despliegue

```bash
cd terraform
terraform init
terraform apply --auto-approve
```

El output `lambda_url` entrega la URL base del API.

### Pruebas con curl

```bash
# Listar tareas
curl <LAMBDA_URL>/tasks

# Crear tarea
curl -X POST <LAMBDA_URL>/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Mi primera tarea","description":"Descripción opcional","status":"pending"}'

# Obtener tarea
curl <LAMBDA_URL>/tasks/<id>

# Actualizar tarea
curl -X PUT <LAMBDA_URL>/tasks/<id> \
  -H "Content-Type: application/json" \
  -d '{"status":"done"}'

# Eliminar tarea
curl -X DELETE <LAMBDA_URL>/tasks/<id>
```

---

## 4. Frontend — Vite + React

### Stack

- **Framework:** React 18 + Vite 5
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS v3
- **HTTP:** `fetch` nativo (sin librerías extra)
- **Estado:** React hooks (`useState`, `useEffect`, `useReducer`)

### Estructura

```
frontend/
├── src/
│   ├── api/
│   │   └── tasks.ts        # Llamadas al API Lambda
│   ├── components/
│   │   ├── TaskList.tsx     # Lista de tareas con filtros
│   │   ├── TaskCard.tsx     # Tarjeta individual de tarea
│   │   ├── TaskForm.tsx     # Formulario crear/editar
│   │   └── StatusBadge.tsx  # Badge de estado visual
│   ├── types/
│   │   └── task.ts          # Tipo Task
│   ├── App.tsx
│   └── main.tsx
├── .env.local               # VITE_API_URL=<lambda_url>
├── index.html
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

### Funcionalidades de la UI

1. **Listado de tareas** con filtro por estado (`Todas | Pendiente | En progreso | Completada`)
2. **Crear tarea** — formulario modal con título (requerido), descripción y estado inicial
3. **Editar tarea** — click en tarjeta abre modal pre-poblado
4. **Cambio rápido de estado** — menú desplegable en la tarjeta
5. **Eliminar tarea** — botón con confirmación
6. **Estados de carga** — skeleton loaders y feedback de error
7. **Diseño responsive** — funciona en móvil y escritorio

### Despliegue

1. Build local:
   ```bash
   cd frontend
   npm install
   npm run build
   ```
2. Repositorio GitHub: subir con `git push`
3. Vercel: conectar repo, configurar `VITE_API_URL` como variable de entorno en el dashboard de Vercel, deploy automático.

---

## 5. Orden de ejecución

```
1. Escribir código Lambda  (lambda/)
2. Escribir Terraform      (terraform/)
3. terraform apply --auto-approve
4. Probar API con curl
5. Escribir frontend       (frontend/)
6. Probar frontend local   (npm run dev)
7. Push a GitHub
8. Deploy en Vercel
```

---

## 6. Configuración AWS

- **Región:** `us-east-1` (configurable en `terraform.tfvars`)
- **Credenciales:** perfil local `~/.aws/credentials` o variables de entorno `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`
