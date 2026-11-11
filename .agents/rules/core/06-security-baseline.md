---
trigger: always_on
description: Seguridad base.
---

# 06. Seguridad Base

> **Por qué:** Un secreto filtrado o una entrada sin validar es un incidente, no un bug.

1. No escribas secretos en código, logs ni prompts. Usa variables de entorno cuando sea necesario.
2. No leas ni edites `.env` ni credenciales sin necesidad.
3. Valida toda entrada externa en la frontera.
4. No agregues dependencias sin justificación clara.
5. Ante acción destructiva o irreversible (borrar datos, `rm -rf`), pregunta primero.

## Guardián
Escáner de secretos y auditoría de dependencias.

<!-- adapt -->
- Auditoría: `pnpm audit`.
<!-- /adapt -->
