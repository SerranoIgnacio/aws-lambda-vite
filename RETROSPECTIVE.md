# Retrospectiva de sesión — Task Manager (AWS Lambda + Vite)

**Fecha:** 2026-07-01
**Alcance:** retomar una sesión interrumpida (WSL se colgó a mitad de un cambio de infraestructura), completar el backend, construir el frontend desde cero, y publicar todo (repos + deploy).

---

## Línea de tiempo

1. **Diagnóstico del estado heredado.** La sesión anterior había dejado `lambda/` completo y funcional, pero `terraform/` en un estado inconsistente: el último `terraform apply` real (según `terraform.tfstate`) había desplegado una **Lambda Function URL** (tal como pedía el `CLAUDE.md`), pero el `main.tf` en disco ya estaba editado para usar **API Gateway HTTP API** en su lugar — un cambio nunca aplicado. `terraform plan` confirmó el drift (5 recursos por crear, 2 por destruir). El frontend no existía.

2. **Primera decisión: volver al spec.** Se le preguntó al usuario cómo proceder y se optó por revertir a Function URL para respetar el `CLAUDE.md` al pie de la letra. Se reconstruyó `main.tf`/`outputs.tf` a partir de los atributos exactos guardados en el state (`aws_lambda_function_url`, `aws_lambda_permission`), logrando `terraform plan` sin diffs.

3. **El Function URL estaba roto.** Al probar con `curl`, la Function URL devolvía `403 Forbidden` (`AccessDeniedException`) pese a que `authorization_type = NONE` y la resource policy pública eran correctas (verificado con `aws lambda get-function-url-config` / `get-policy`). Invocar la Lambda directamente (`aws lambda invoke`) funcionaba sin problema — el bug era específico de la capa de autorización del Function URL.

4. **Investigación de causa raíz.** Se revisó CloudTrail y se encontró evidencia de que la sesión anterior ya había peleado con este mismo error: **~40 llamadas `AddPermission20150331v2`** en un lapso de 10 minutos (18:13–18:24), más un `RemovePermission`+`AddPermission` manual fuera de Terraform, todo sin éxito. El cambio a `main.tf` hacia API Gateway ocurrió 5 minutos después del último intento — es decir, **fue un workaround deliberado**, no un capricho. Se descartaron Service Control Policies, Resource Control Policies y AWS Config con remediación automática como causa. La causa raíz de por qué esta cuenta AWS bloquea las Function URLs públicas **no se pudo determinar**.

5. **Segunda decisión: usar API Gateway.** Con esta evidencia se le devolvió la pregunta al usuario, que confirmó seguir el camino que ya había tomado la sesión anterior. Se aplicó Terraform (`5 to add, 2 to destroy`) y se verificaron los 5 endpoints CRUD con `curl` — funcionando correctamente.

6. **Construcción del frontend.** Se scaffoldeó con `npm create vite@latest -- --template react-ts`, pero el scaffold trajo por defecto **React 19 + Vite 8 + TS 6**, mientras el `CLAUDE.md` pedía explícitamente **React 18 + Vite 5 + Tailwind v3**. Se repinnearon versiones y se reescribieron los `tsconfig.*` para el toolchain más viejo. Se implementó la estructura completa (`api/`, `types/`, `components/`, `App.tsx` con `useReducer`) y se verificó visual y funcionalmente con Playwright headless (crear, editar, cambio rápido de estado, eliminar con confirmación, filtros, estado vacío) — sin errores de consola.

7. **Publicación en control de versiones.** El usuario pidió inicialmente GitHub, pero a mitad de camino redirigió a un **GitLab self-hosted** (`gitlab.codecrypto.academy`). Se creó el repo vía `glab repo create` y se hizo push. Hubo un obstáculo no trivial: el credential helper de git (`store`, con `useHttpPath=true`) requiere que la entrada guardada incluya el **path completo del repo**, no solo el host — un `git credential approve` sin `path=` no matcheaba en el lookup posterior. Una vez corregido, el push funcionó. Después, el usuario pidió además espejar a GitHub (para poder usar la integración nativa Git↔Vercel); se creó con `gh repo create` y se configuró un segundo remoto (`github`) sin pisar `origin` (GitLab).

8. **Deploy en Vercel.** Se detectó que la integración nativa de Vercel con Git **no soporta instancias GitLab self-hosted**, solo GitLab.com — lo cual invalidaba la ruta "conectar repo → deploy automático" del `CLAUDE.md` tal cual. Se optó por deploy directo vía Vercel CLI (`vercel --prod`) más el mirror a GitHub (sin conectar la integración todavía). El login por device-flow de Vercel falló dos veces porque se estaba ejecutando con un `timeout` de 15–20s — insuficiente para que un humano complete el flujo OAuth en el navegador. Se resolvió lanzando el login en background sin timeout agresivo. Se configuró `VITE_API_URL` en los tres entornos (`production`, `preview`, `development`) y se deployó a producción, verificando el sitio en vivo con Playwright.

---

## Decisiones clave y su razón

| Decisión | Razón |
|---|---|
| API Gateway en vez de Lambda Function URL | El Function URL da 403 real de AWS en esta cuenta; causa raíz no identificable con los permisos disponibles. Ver `ARCHITECTURE.md`. |
| React 18 + Vite 5 (no las últimas versiones del scaffold) | El `CLAUDE.md` las pide explícitamente; se prioriza seguir el spec del proyecto sobre usar "lo más nuevo". |
| Repo en GitLab self-hosted como `origin`, GitHub como mirror secundario | Petición explícita del usuario a mitad de sesión; GitHub se sumó después para viabilizar integración con Vercel. |
| Deploy a Vercel vía CLI, no vía integración Git | Vercel no soporta GitLab self-hosted en su integración nativa. Facilita el camino pero **no hay auto-deploy en cada push** todavía. |

## Pendientes / deuda conocida

- No hay auto-deploy configurado: los pushes a GitHub no disparan un nuevo deploy en Vercel (requeriría conectar la integración Git desde el dashboard de Vercel, usando el mirror de GitHub).
- No se identificó la causa raíz del 403 en Lambda Function URL — si en el futuro se quiere reintentar esa vía, hay que investigar más a fondo (posible restricción a nivel de cuenta AWS no visible con los permisos IAM actuales).
- No hay tests automatizados (unitarios ni end-to-end) — la validación de esta sesión fue manual (`curl` + Playwright ad-hoc).
- No hay CI/CD en ninguno de los dos repos.

## Aprendizajes reutilizables

- Ante una sesión interrumpida, comparar `terraform plan` contra el `main.tf` en disco es la forma más rápida de detectar cambios a medio aplicar.
- CloudTrail (`lookup-events` filtrando por `ResourceName`) es útil para reconstruir qué intentó una sesión anterior, incluso sin acceso a su historial de conversación.
- Con `credential.helper=store` y `useHttpPath=true`, las credenciales deben guardarse con el `path` completo del repo — un host-only credential no sirve para pushear a un repo específico.
- Los flujos de login por device-code (Vercel, y en general OAuth device flow) necesitan tiempo real de un humano; correrlos con un `timeout` corto los mata antes de que se puedan confirmar en el navegador.
