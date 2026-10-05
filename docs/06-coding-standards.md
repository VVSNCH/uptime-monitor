# Coding Standards — Uptime Monitor

How code in this repository is written. Most of it is enforced by ESLint,
Prettier and TypeScript; where a rule is enforced, that is noted, because a
rule nobody checks is a suggestion.

## 1. TypeScript

- `strict` and `noUncheckedIndexedAccess` everywhere. Enforced by `tsc`.
- No `any`. Use `unknown` at a boundary and narrow it with a type guard.
  Enforced.
- Shapes shared between apps are declared once in `packages/shared` and
  imported, never re-declared.
- Enums shared between apps are `as const` objects with a derived union type,
  not TypeScript `enum`.
- Type-only imports use `import type` or an inline `type` marker. Enforced and
  autofixed.

## 2. Naming

| What | Convention | Example |
|---|---|---|
| Variables, functions, parameters | camelCase | `lastCheckedAt`, `resolveTarget` |
| Booleans | a yes/no question | `isHealthy`, `hasHeader`, `shouldRetry` |
| Types, interfaces, classes, components | PascalCase | `MonitorSummary`, `StatusBadge` |
| Module-level constants | UPPER_CASE | `MAX_REDIRECTS`, `QUERY_KEYS` |
| Database tables | plural snake_case | `monitors`, `daily_stats` |
| Database columns, enums, indexes | snake_case | `last_checked_at`, `monitor_status` |
| Event handlers | `handleX`; props that receive them `onX` | `handleRetry`, `onRetry` |

Identifier rules are enforced by `@typescript-eslint/naming-convention`.
Object keys are exempt, since they often mirror an external format such as an
HTTP header or an environment variable.

Prisma models and fields stay PascalCase and camelCase in code and map to the
snake_case names with `@@map` and `@map`.

### File names

| Where | Convention | Example |
|---|---|---|
| Nest apps and packages | kebab-case, role as a suffix | `health.controller.ts`, `url-guard.service.ts` |
| Web components and routes | PascalCase, one folder per component | `StatusBadge/StatusBadge.tsx` |
| Web hooks, services, constants, types | camelCase | `useApiQuery.ts`, `queryClient.ts` |
| Tests | next to the code, `.spec.ts` (backend) or `.test.ts` (web) | `state-machine.service.spec.ts` |

Enforced by `eslint-plugin-check-file`.

## 3. Imports

Sorted into groups: Node built-ins, packages, then relative imports, with a
blank line between groups. Enforced and autofixed. Inside a package, relative
imports end in `.js` because the backend compiles to native ES modules.

## 4. Errors

- Backend services throw `AppException(status, ERROR_CODES.x, message)`. Every
  Nest app installs the same exception filter, so every error reaches the client
  as `{ statusCode, code, message }`. Unexpected errors are logged in full and
  returned as a generic 500.
- The web app never reads raw Axios errors. Everything is normalised to
  `ApiRequestError`, and screens decide what to show from its `code`.
- A promise is awaited, returned, or explicitly discarded with `void`. Floating
  promises are a lint error.
- A `switch` over a union handles every case or has a `default`. Enforced.

## 5. Backend structure

- A controller validates and delegates; it holds no business logic.
- A service holds business logic. A repository is the only place a Prisma query
  appears, and every monitor query takes a `userId`.
- Request bodies are classes decorated with `class-validator`. The global
  validation pipe strips fields that are not declared.
- Configuration is read through `ConfigService` from a schema validated at
  startup. No `process.env` in application code.
- No `console.log`. Use the Nest logger, which writes structured JSON through
  pino. Enforced.

## 6. API conventions

- URLs are versioned: `/api/v1/...`. Infrastructure endpoints are not:
  `/health` reports readiness (dependencies included, 503 when degraded) and
  `/health/live` reports liveness (the process is up, nothing else).
- Plural nouns for resources; verbs only for actions that are not a resource
  change, such as `/monitors/:id/pause`.
- Every request carries an `x-request-id`. The gateway assigns one if the
  client did not, forwards it to the api, and returns it in the response, so a
  single request can be followed through both services' logs.
- OpenAPI docs are generated from the controllers and DTOs and served at
  `/api/docs`.

## 7. Frontend

- UI is built from MUI components and styled-components only. Colours, spacing
  and breakpoints come from the theme, never literals.
- Reusable components expose a small set of named variants (`variant`, `size`,
  `tone`) backed by lookup maps, not a growing list of boolean props.
- Data is fetched only through `useApiQuery` and `useApiMutation`. Query keys
  live in `QUERY_KEYS` and endpoints in `API_ENDPOINTS`.
- Every list has an empty state, every data view a loading skeleton, and every
  request an error state.

## 8. Comments

A comment explains why something is done, when the reason is not visible in the
code. A comment that restates the code is deleted.

## 9. Tests

Tests target logic that fails silently: the state machine, idempotency, the URL
guard, rollups, token rotation, error normalisation. Controllers and visual
appearance are not unit tested. A test that needs a network uses a local server
started by the test itself.

## 10. Before code is shared

Staged files are linted and formatted automatically on commit. The full gate,
also run in CI, is:

```sh
npm run typecheck && npm run lint && npm run format:check && npm run build && npm test
```
