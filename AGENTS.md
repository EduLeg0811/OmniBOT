# ConsBOT

Guia de desenvolvimento para assistentes e agentes IA.

- **Stack:** React 19, Vite, Tailwind CSS v4, Vercel AI SDK, TypeScript.
- **Roteamento:** React Router (SPA).
- **Backend:** Nenhum próprio — puro frontend. Todas as chamadas (chat em
  streaming, sugestões, listagem de vector stores) vão para o Main-Server
  compartilhado via `src/lib/main-server.ts`. Ver `docs/CONSUMERS.md` no
  repositório do Main-Server para o contrato de `/api/llm` e `/api/decisions`.
- **Módulo AGENT (`src/agent`):** pills de ação ao lado da resposta. O
  classificador de turnos (porteiro) é um questionário fechado na OpenAI
  Decisions API, via `POST /api/decisions` do Main-Server
  (`src/agent/planner/decisions.ts`), com fallback para o classificador antigo
  em `/api/llm` (`plan.ts`). Especificação em `docs/agent-rules.docx`, gerada
  por `scripts/update-agent-rules-docx.py`; código e documento mudam juntos.
  Decisões e medições da migração em `docs/DECISIONS_MIGRATION.md`.
- **Mudou o classificador?** Rode `npm test` e `npm run agent:suite` (precisa
  do Main-Server no ar); compare com `-- --engine responses` e confira a
  ficha `controle`, que não deve ser usada para calibrar.
