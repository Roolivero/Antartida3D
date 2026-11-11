---
trigger: always_on
description: Convenciones centrales del proyecto (Hackatón SoberaníaTech, Eje 2).
---

# Convenciones del Proyecto

Reglas y arquitectura de trabajo para el equipo y agentes en este repositorio.

## 1. Flujo de issues y ramas
- Nadie trabaja sin un issue asignado en GitHub.
- Una rama por issue, creada desde `main` con `gh issue develop <N> --base main --checkout`.
- Nunca commitear en `main`.
- Un issue en curso por persona; un PR por issue.
- Tocar solo los archivos necesarios para el issue asignado. Avisar si se modifican archivos compartidos.

## 2. Idioma
- Documentación, planes, reportes, mensajes de commit y chat: **español**.
- Código, identificadores y comentarios en el código: **inglés**.

## 3. Contenido y fuentes verificadas (Eje 2)
- Toda información científica o histórica lleva su fuente verificada (referencia o URL, organismo/autor, fecha de consulta).
- Preferir fuentes primarias (organismos científicos, publicaciones oficiales).
- Nunca inventar ni completar fuentes. Si falta origen, marcar como pendiente (`[Contenido provisional]`, `[Fuente a definir]`).
- Nunca presentar una simulación o reconstrucción como dato real; declararlo explícitamente en la interfaz.

## 4. Arquitectura del repositorio (S1)
- Monorepo pnpm en la raíz.
- `apps/`: aplicaciones independientes a comparar (`apps/dibujado` en puerto 5103, `apps/atlas` en puerto 5175).
- `packages/`: código compartido (`packages/core`, `packages/react-ui`, `packages/e2e`).
- `scripts/bench/`: scripts de benchmark de rendimiento.
- `docs/`: documentación unificada (`propuesta.pdf`, `diseno/`, `decisiones.md`, `rendimiento.md`).

## 5. Cómo descartar una app
- Para quedarse con una sola app, alcanza con borrar la carpeta de la otra en `apps/` y quitar su script correspondiente del `package.json` raíz.

## 6. Comandos canónicos
- `pnpm install`: instalación de dependencias del workspace.
- `pnpm dev`: inicia `apps/dibujado` (puerto 5103).
- `pnpm dev:atlas`: inicia `apps/atlas` (puerto 5175).
- `pnpm build`: compila todas las aplicaciones.
- `pnpm test`: corre suite de pruebas unitarias (`packages/core` y `apps/atlas`).
- `pnpm typecheck`: validación de tipos TypeScript en el workspace.
- `pnpm e2e`: tests de flujo con Playwright para `apps/dibujado`.
- `pnpm --filter @antartida/atlas test:ui`: tests de interfaz para `apps/atlas`.
- `pnpm bench`: benchmark de rendimiento.
