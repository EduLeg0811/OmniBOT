# Classificador (porteiro) → OpenAI Decisions API

Data: 2026-10-19. Mapa, diagnóstico e plano da migração do classificador de
turnos do ConsBOT da Responses API para a Decisions API (`POST /v1/decisions`,
modelo `gpt-6-luna`).

## 1. Mapa

```
ChatWindow.tsx (envio)
  └─ triageAgent(ctx)                      src/agent/planner/triage.ts
       ├─ planAgent(ctx)                   src/agent/planner/plan.ts
       │    ├─ instruções  = agentInstructionsFor()  (prompt.ts + describe() de cada ferramenta)
       │    ├─ schema      = AGENT_PLANNER_SCHEMA     (schema.ts, JSON Schema estrito)
       │    └─ fetch POST {MainServer}/api/llm  ──► app/routers/llm.py
       │                                             └─ app/core/llm.py → POST /v1/responses
       │    └─ normalizePlannerPayload() → AgentPlan (modo, ações, answer)
       └─ matchDeterministicActions(ctx)   src/agent/planner/rules.ts (periódicos, livros PDF)
  └─ withinBudget(triage, AGENT_TRIAGE_BUDGET_MS = 3000)
       ├─ direct  → responde sem o modelo principal (answer do classificador / list_sources)
       ├─ corpus  → recuperação semântica literal (só em "Citações")
       └─ full    → modelo principal; pills entram ao lado da resposta
```

Saída do classificador hoje (um JSON por turno):

| Campo | Tipo | Uso |
|---|---|---|
| `reason` | texto livre | raciocínio + auditoria |
| `responseMode` | full / direct / corpus | rota do turno |
| `responseConfidence` | número inventado pelo modelo | auditoria |
| `actions[]` (≤3) | intent + confidence + term + field/book/area/section/resource/style | pills |
| `answer` | texto livre | resposta de `direct`/`corpus` |

11 ferramentas (registry.ts), 27 destinos CCCI, 7 recursos, 15 obras, 3 seções
Encyclossapiens, 4 campos de verbete.

## 2. Diagnóstico

**Custo e latência**
- Medido no próprio código: p50 2,6 s, p90 4,5 s. O orçamento de 3 s faz boa
  parte dos turnos seguir "especulativa", sem `direct` e sem `list_sources`.
- **Bug encontrado:** o `/api/llm` identifica a origem do navegador como
  `consbot` e aplica `consbot_model_override` (`gpt-6-luna`, esforço `low`,
  em `server-data/rate_limit_state.json`). O classificador pede esforço `none`,
  mas roda com `low`: paga raciocínio que não pediu.
- Gera texto (reason + answer + JSON): tokens de saída cobrados e latência
  proporcional ao tamanho do JSON.
- Prompt cacheado por `promptCacheKey`, mas o schema (com todas as descrições
  de destinos) é reenviado inteiro a cada turno.

**Precisão**
- `confidence` e `responseConfidence` são números escritos pelo modelo, não
  probabilidades: o limiar 0,55 corta por um valor sem calibração.
- Schema estrito obriga a preencher `book/area/section/resource/field` em
  toda ação; o histórico do código registra o efeito (TEAT em 61,5% das ações).
- `term` é texto livre: o prompt precisa proibir concatenação de palavras da
  resposta ou do texto colado, e há truncamento defensivo (`cleanTerm`).
- `answer` em `direct` é texto gerado: risco de prometer busca ou afirmar
  resultados (o prompt tem três regras só para conter isso).
- A precedência "busca de verbete + busca em livros juntas" depende do modelo
  lembrar da regra; não há garantia estrutural.

**Abrangência**
- Uma ação por ferramenta; `open_resource` e `catalogo_ccci` escolhem um único
  destino por enum dentro de um campo que só vale para elas.
- Formas de turno (8 arquétipos) existem só no prompt; não são observáveis na
  auditoria.

## 3. Decisions API — o que a documentação oficial diz

Fontes: [guia](https://developers.openai.com/api/docs/guides/decisions) e
[referência](https://developers.openai.com/api/reference/resources/decisions/methods/create).

- `POST /v1/decisions`, beta pública, só `gpt-6-luna`.
- `input`: texto ou mensagens (developer/system só texto; user texto+imagem).
- `questions`: 1–200 por chamada, tipos `predicate` (probabilidade 0–1),
  `choice` (2–255 opções, devolve escolha + probabilidades + confidence) e
  `score` (níveis ordenados).
- Cada pergunta pode voltar `refusal` sem derrubar as outras.
- `prompt_cache_key` (≤64), `safety_identifier`.
- **Não gera texto.** Preço: US$ 0,10 / 1M tokens de entrada; saída não cobra.
- Teste real com a chave do Main-Server: habilitado, 277 ms a 3,3 s, saída
  determinística entre chamadas.

## 4. Plano

**Ideia central:** trocar "o modelo escreve um JSON" por "o modelo responde a
um questionário". Tudo que era texto livre vira escolha fechada ou probabilidade.

| Antes (texto) | Depois (Decisions) |
|---|---|
| `reason` | `turn_shape` (choice: 12 formas) + rastro determinístico das probabilidades |
| `responseMode` | derivado de `turn_shape`; `raw_excerpts` (predicate) para corpus |
| `confidence` por ação | probabilidade calibrada de um predicate por ferramenta |
| `term` livre | `term` choice entre n-gramas extraídos da própria mensagem (+ "nenhum") |
| `book/area/section/resource/field` obrigatórios | choices separados, com "nenhum" quando cabe |
| `answer` gerado | respostas de catálogo (saudação, agradecimento, despedida, corpus) |
| precedência livros+verbetes | `search_scope` (ambos / livros / verbetes) aplicado no código |

Consequências deliberadas:
- Pergunta sobre o próprio ConsBOT passa a ir ao modelo principal (`full`),
  em vez de uma resposta curta improvisada pelo classificador. Erro de
  "engolir" pergunta vai a zero por construção.
- O termo sempre existe literalmente na mensagem do usuário (ou da anterior,
  em continuação elíptica); concatenação e invenção ficam impossíveis.
- Texto colado: candidatos a termo saem só da instrução (início/fim).

**Implementação**
1. Main-Server: `POST /api/decisions` (proxy fino, sem cota, sem override de
   modelo), `app/core/decisions.py`, testes e `docs/CONSUMERS.md`.
2. Frontend: `src/agent/planner/decisions.ts` (questionário + candidatos de
   termo + mapeamento → `AgentPlan`), `plan.ts` passa a usar Decisions com
   fallback automático para o caminho Responses atual se o endpoint não
   existir (deploys separados) ou falhar.
3. Fallback Responses: envia `app: "consbot-agent"` para não cair no override
   de modelo/esforço.
4. Testes vitest do mapeamento e suíte real (`npm run agent:suite --
   --engine decisions|responses`) para comparar os dois motores nos mesmos casos.
5. Ajustar orçamento/timeouts conforme a latência medida.

Fora do escopo: sugestões de continuidade (`follow-up.ts`) geram texto e
continuam na Responses API.

## 5. Resultado (implementado em 2026-10-19)

Suíte real (`npm run agent:suite`, Main-Server local, 3 execuções por caso):

| | Responses (antigo) | Decisions (novo) |
|---|---|---|
| Casos estáveis (fichas 1–9 + geral, 87) | 64 | 87 |
| Casos instáveis entre execuções | 11 | 0 |
| Ações indevidas (casos sem ação) | 32 em 96 | 0 em 96 |
| Perguntas engolidas (direct indevido) | 3 | 0 |
| Latência p50 / p90 | 2.941 ms / 15.467 ms | 274 ms / 398 ms |
| Custo por turno | ~3.350 tokens, entrada + saída | ~4.500 tokens, só entrada (US$ 0,10/M) |

Ressalva: as perguntas, os limiares e as precedências foram calibrados sobre as
fichas. Por isso há a ficha `controle` (20 frases escritas depois da
calibragem): na primeira passada os dois motores ficaram em 19/20 — a precisão
fora da amostra empata, e o ganho real está em estabilidade, ausência de
ações espúrias e latência. A única falha do Decisions no controle
(«ortopensata aleatória») levou a um ajuste na pergunta de Bibliomancia; a
ficha deixou de ser totalmente cega.

Limitação conhecida (igual nos dois motores): grafia errada não é corrigida
(«trnnsmentor» busca «trnnsmentor»). No Decisions o termo é sempre um trecho
da mensagem; corrigir exigiria um vocabulário do corpus como fonte de
candidatos.

Arquivos:
- Main-Server: `app/core/decisions.py`, `app/routers/decisions.py`,
  `tests/test_decisions.py`, `post_openai` em `app/core/llm.py`, docs.
- Frontend: `src/agent/planner/decisions.ts` (+ testes), `plan.ts` (motor +
  fallback), `config.ts` (limiares), suíte com `--engine`, `--verbose` e
  ficha `controle`.
- `VITE_AGENT_CLASSIFIER_ENGINE=responses` volta ao motor antigo sem mudar código.

Verificado no app rodando: «Busque o termo “dupla evolutiva” nos livros» passou
por `/api/decisions` (15 perguntas, 4.494 tokens, 382 ms) e mostrou a resposta
completa com o pill «Livros: dupla evolutiva».

## 6. Segunda rodada (2026-10-19)

**Pills depois da resposta — avaliado, não adotado.** A ideia era decidir os
pills com o texto respondido como entrada (`buildActionDecisionRequest`). Sobre
respostas reais do app (mesmo modelo, prompt e base RAG), ficou em 100/107
contra 107/107 decidindo com a triagem; a ficha `controle` empatou (20/20).
Quando a resposta já explica o termo ou lista as instituições, o modelo larga o
pill que o usuário pediu. O código fica disponível para reavaliar:
`npm run agent:suite -- --timing after`.

**Catálogo CCCI ampliado de 27 para 63 destinos**, a partir do mapa completo do
icge.org.br (`docs/icge/ICGE_MAPA.md` e `docs/icge/icge-pages.json`: 573 páginas,
180 úteis; os 21 ids antigos continuam no ar). Entraram glossário multilíngue,
dicionário de neologismos, siglas, atividades gratuitas, matriz de cursos,
dinâmicas, PGC (três páginas), Cognópolis Experience, censo, Colégios
Invisíveis, livros on-line e em outros idiomas, artigos acadêmicos, memória
digital, entre outros. Novas precedências em código: destino específico vence
recurso genérico (simulado da PGC × quiz; livros em outros idiomas × Drive),
referência bibliográfica encobre catálogo de livros, busca no Conscienciograma
encobre a página do livro.

Suíte com 130 casos, 3 execuções: 127 estáveis, 0 instáveis, 0 ações
indevidas em 111 execuções, p50 267 ms. Ficha `icge` (calibragem) 13/13; ficha
`controle_icge` (escrita antes da calibragem) 8/10 — falham «verbetes
relacionados ao tema X» (nenhum pill) e «quem mais escreveu verbetes» (ranking
certo, mais uma busca de verbete indevida). Limiar do catálogo passou de 0,80
para 0,75 com a medição. Tokens por turno: ~5.600 (antes ~4.500).

## 7. Regras gerais para os erros do controle cego (2026-10-19)

Os dois erros de `controle_icge` foram corrigidos com regras gerais, sem
exceção por frase:

1. **Catálogo dividido em oito perguntas por área** (mídia, atividades, livros,
   publicações, verbetes, referência, PGC, institucional) em vez de uma escolha
   com 63 opções. Na escolha única, a probabilidade se espalhava e o destino
   certo perdia para «nenhum» (era o caso da Cosmovisão Remissiológica). O
   destino de maior 1 − P(nenhum) entre as áreas vira o pill.
2. **Nome de fonte nunca é termo de busca** (Enciclopédia, Conscienciograma,
   Verbetoteca, ICGE, CCCI…), nem sozinho nem dentro de termo composto, salvo
   entre aspas. Verbos de autoria e relação (escreveu, autor, relacionados)
   também não abrem nem fecham termo.
3. **Catálogo e busca disputam a mesma necessidade**: quando os dois disparam,
   pedido explícito de busca fica com a busca; nos demais vence o mais
   provável. Substituiu as regras pontuais por id (autores_livros, verbete*),
   e as precedências entre ferramentas passaram a valer por área.
4. Instrução das áreas: coisa com página própria (atividade, prova,
   instituição, ferramenta, coleção, obra) recebe o destino mesmo em «o que
   é» / «existe»; conceito que a resposta explica, não. A descrição de
   «iniciantes» passou a exigir que o usuário diga que está começando.

Suíte (130 casos, 3 execuções): 130 estáveis, 0 ações indevidas em 111
execuções, p50 263 ms; ~7.400 tokens por turno. Controle novo `controle3`
(12 frases escritas depois das regras, não usadas para calibrar): 11/12; a
falha é limítrofe («Explique o que é um Colégio Invisível» ficou sem destino).
