# Auditoria do Direcionador: perguntas sobre fontes do corpus

Data: 2026-10-19. Escopo: as perguntas do Decisions que decidem pills de livros,
verbetes, artigos e obras de referência (busca, bibliografia, LexiCons,
catálogo e recursos), e os links que elas montam.

Base:

- o questionário real enviado ao Direcionador;
- o código das páginas de destino do Cons-IA, para ver que parâmetros cada uma aceita;
- o log real de **2.040 perguntas** de usuários ao ConsBOT (09/09 a 19/10/2026),
  das quais **452** mencionam livros, verbetes, artigos, referências ou busca.

Cada pergunta do log passou pelo Classificador e pelo Direcionador antes e
depois das correções. O resumo deste documento não reproduz nenhum dado
pessoal do log (IP, cidade, provedor).

## 1. Links que abriam errado (corrigido)

Conferido no código das páginas do Cons-IA. Cada página descarta em silêncio o
parâmetro que não conhece, e o usuário cai numa busca diferente da anunciada.

| Destino | Problema | Efeito no usuário | Correção |
|---|---|---|---|
| Busca de verbetes | O ConsBOT mandava `field=texto` e `field=autor`. A página só aceita `titulo`, `verbetografo`, `especialidade`, `definologia` e `todos` | «Verbetes de fulano» buscava o nome no **título** e voltava vazio. Toda busca «no texto» era, na prática, busca no título | `fields=todos` para texto e `fields=verbetografo` para autor. Entrou o campo `definologia` (definição) |
| Bibliografia de livros | As siglas `TEAT` e `LO` não existem no módulo (lá são `T200` e `LO1`/`LO2`) | «Citar o Léxico de Ortopensatas», pedido frequente no log, abria a página sem obra | `T200` e `LO2` (2ª ed., vigente) |
| Bibliografia de livros | Só aceitava as 11 obras da busca, mas o módulo tem 21 | Nossa Evolução, Projeções da Consciência, 100 Testes, Conscienciograma, Manual de Redação, Megapensenes, Dicionário de Neologismos e Enciclopédia não montavam referência | As 8 obras entraram no catálogo, só para a bibliografia |
| Busca em livros | `MINI_ARLINDO` e `QUEST` não existem na busca | A restrição a essas obras era ignorada | Marcadas como sem busca de texto |
| Livros em PDF | O link do Drive tinha `/u/2/`, que é o índice da conta Google de quem criou o link | Em outro navegador, abria outra conta ou pedia login | Link sem o índice da conta |

## 2. Perguntas e opções do Direcionador

**Corretas e precisas** (sem mudança):

- **Busca literal explícita.** «Localize X», «onde aparece X», «busque X nos livros/verbetes».
- **Escopo livros × verbetes.** Livros e verbetes juntos por padrão, e só livros quando a obra é nomeada.
- **Conscienciograma.** A busca dentro dele é separada da página do livro inteiro.
- **Verbetes afins.** Pedido de verbetes relacionados vai para a Cosmovisão Remissiológica.
- **Escrita de verbete.** Vai para o Kit do Verbetógrafo.
- **Artigos sobre um tema.** Vão para o portal de periódicos.

**Corrigidas**, a partir de padrões que se repetem no log:

| Pergunta | Problema no log | Correção |
|---|---|---|
| `busca_termo` | «Definição de X **e referência bibliográfica**», «dê as referências», «qual a fonte», «existe verbete sobre X?», «verbetes **sobre** X» e «onde encontro material sobre X» ficavam sem pill. O motor antigo atendia todos | Pedido de fonte, referência, existência ou lista de verbetes sobre um tema agora é busca. «Afins/relacionados» continua indo para a remissiologia |
| `bibliografia_livro` × `bibliografia_verbete` | O pill de bibliografia de livros disparava para conceitos («Bibliografia: circuito coronofrontochacra») e abria o módulo sem obra | Referência de um CONCEITO ou tema é a do verbete homônimo («Referência do verbete: X»), e referência de LIVROS fica com o módulo de livros. Quando as duas disparam, fica a mais provável. Sem obra resolvida, o módulo abre na escolha da obra |
| `lexicons` | «O que é vida», «o que é energia», «infância», «abordagem», «trafores»: 76 pills, a maioria em perguntas conceituais | Só com pedido explícito de etimologia, sinonímia, antonímia, grafia, significado DA PALAVRA ou desambiguação |
| `bibliomancia` | «Quero uma ortopensata que inclua X» virava sorteio | Só sorteio. Ortopensatas sobre um tema são busca |
| `termo` (candidatos) | Termos como «fontes», «referncias disso», «questões 65», «referências bibliográficas da Conscienciologia», «Transcreva a página 906» | Palavras que nomeiam o pedido ou a fonte (fonte, referência, bibliografia, trecho, página, capítulo, questão, material, acervo, artigo), verbos de pedido (transcreva, verifique, indique) e dêiticos (isso, desse, aqui) nunca abrem nem fecham termo. «Conscienciologia» nunca é termo. O título de uma obra também não («Citar o Léxico» não é busca) |
| Forma do turno | Conceito nu («alucinação», «Carma») ganhava busca ou sorteio de ortopensata | Conceito nu só ganha busca quase certa (≥ 0,9). Pergunta sobre o assistente e turno social nunca ganham busca. O sorteio exige que a mensagem fale de ortopensata ou Bibliomancia |
| `campo_verbete` | As opções não tinham descrição | Cada campo descrito. Novo campo `definologia` |
| Catálogo, todas as áreas | «Gostaria de criar um curso», «faça um convite», «desenhe um slide» puxavam Matriz de cursos ou Infográficos | `nenhum` quando o usuário pede ao assistente para produzir algo |
| Catálogo, destino `waldo_vieira` | Disparava para qualquer pessoa («fale do eduardo azevedo», «pietro ubaldi») | Só quando a pergunta é sobre o próprio Waldo Vieira |
| Descrições do catálogo | Citavam nomes internos (`search_verbete`, `recurso periodicos`) que o modelo não vê no questionário | Reescritas em linguagem natural |
| Regras determinísticas | O padrão «artigo» disparava Periódicos em quem escreve artigo ou pede formato de citação (30 casos). «Livro… link» disparava Livros em PDF em quem discute capítulos do próprio livro (5) | Passaram a ser só rede de segurança, quando o Direcionador não responde |

## 3. Resultado

Medido sobre o log real (2.040 perguntas, uma passada pelos dois blocos antes e
outra depois das correções) e sobre a suíte de 142 casos (2 execuções).

| | Antes da auditoria | Depois |
|---|---|---|
| Perguntas sobre fontes (452) que recebem pill | 207 | 236 (motor antigo: 217) |
| Pills de busca em livros/verbetes | 106 | 212 |
| Referência do verbete (nova: referência de um conceito) | 0 | 44 |
| LexiCons | 76 | 34 |
| Periódicos | 44 (33 da regra «artigo») | 11 |
| Links de verbetes que abriam no campo certo | só os de título | todos |
| Suíte: casos estáveis | 141/142 | 140/142 |
| Suíte: pills indevidos | 0 | 2 em 76 |
| Latência do Classificador (p50) | 0,26 s | 0,26 s |

Leitura honesta:

- **Os ganhos.** Pedidos de fonte e de referência voltaram a ter pill, e
  os links passaram a abrir onde dizem. Caíram os pills sem propósito: LexiCons
  em perguntas conceituais e Periódicos para quem escreve artigo.
- **Precisão dos pills novos.** Revisei à mão uma amostra de 40 pills de busca
  ou referência que só existem depois. Cerca de 3 em cada 4 estavam certos. Os
  erros eram quase todos de termo («datas», «análise 1ª parte»). O termo
  «Conscienciologia», o mais frequente, foi tratado depois dessa amostra.
- **Duas falhas na suíte.** «Me fale sobre o livro Projeciologia» ganha o
  catálogo de livros, na borda do limiar (0,75). «Explique o que é um Colégio
  Invisível» segue sem o destino, como antes.
- **Perguntas fora de fontes com pill.** Subiram de 189 para 206. São sobretudo
  perguntas de existência («existe autoreurbex?») que agora ganham busca.

## 4. Limitações que continuam

- O termo é sempre um trecho da mensagem. Grafia errada («trnnsmentor», «Prssão
  holopensenica») não é corrigida, e a busca literal volta vazia.
- Perguntas sobre o CONTEÚDO de um verbete ou livro já nomeado
  («Quais as ideias de fulana no verbete X?») ficam sem pill, por regra das
  fichas. O motor antigo dava «Verbetes».
- O catálogo não tem página para dicionários fora do ICGE, como o Dicionário
  Neológico de Parafenomenologia.
