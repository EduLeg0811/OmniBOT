from pathlib import Path
from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "agent-rules.docx"
BLUE = "2856A3"
PALE = "EAF1FC"

def shade(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), fill)
    tc_pr.append(shd)

def set_cell_text(cell, value, bold=False, color=None):
    cell.text = ""
    p = cell.paragraphs[0]
    r = p.add_run(value)
    r.bold = bold
    r.font.size = Pt(8.5)
    if color:
        r.font.color.rgb = RGBColor.from_string(color)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER

def table(headers, rows, widths=None):
    t = doc.add_table(rows=1, cols=len(headers))
    t.style = "Table Grid"
    for i, header in enumerate(headers):
        set_cell_text(t.rows[0].cells[i], header, True, "FFFFFF")
        shade(t.rows[0].cells[i], BLUE)
    for row in rows:
        cells = t.add_row().cells
        for i, value in enumerate(row):
            set_cell_text(cells[i], str(value))
            if len(t.rows) % 2 == 1:
                shade(cells[i], "F7F9FC")
    if widths:
        for row in t.rows:
            for i, width in enumerate(widths):
                row.cells[i].width = Cm(width)
    doc.add_paragraph()
    return t

def bullet(text, level=0):
    p = doc.add_paragraph(style="List Bullet" if level == 0 else "List Bullet 2")
    p.add_run(text)

def page_field(paragraph):
    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = paragraph.add_run("Página ")
    begin = OxmlElement("w:fldChar"); begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText"); instr.set(qn("xml:space"), "preserve"); instr.text = " PAGE "
    end = OxmlElement("w:fldChar"); end.set(qn("w:fldCharType"), "end")
    run._r.append(begin); run._r.append(instr); run._r.append(end)

doc = Document()
section = doc.sections[0]
section.top_margin = Cm(1.8); section.bottom_margin = Cm(1.7)
section.left_margin = Cm(2); section.right_margin = Cm(2)
styles = doc.styles
styles["Normal"].font.name = "Aptos"; styles["Normal"].font.size = Pt(10)
styles["Normal"].paragraph_format.space_after = Pt(5)
for name, size, color in [("Title", 25, BLUE), ("Heading 1", 17, BLUE), ("Heading 2", 12, "3C4B64")]:
    styles[name].font.name = "Aptos Display"
    styles[name].font.size = Pt(size)
    styles[name].font.color.rgb = RGBColor.from_string(color)
header = section.header.paragraphs[0]
header.text = "ConsBOT · Agent Mode"
header.runs[0].font.size = Pt(8); header.runs[0].font.color.rgb = RGBColor(100, 110, 125)
page_field(section.footer.paragraphs[0])

title = doc.add_paragraph(style="Title")
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
title.add_run("Agent Mode — Clássico")
sub = doc.add_paragraph()
sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = sub.add_run("Especificação funcional e técnica · versão 2")
r.italic = True; r.font.size = Pt(13); r.font.color.rgb = RGBColor(70, 85, 105)
doc.add_paragraph()
box = doc.add_table(rows=1, cols=1)
shade(box.cell(0, 0), PALE)
set_cell_text(box.cell(0, 0), "Objetivo: oferecer ações contextuais úteis sem substituir respostas substantivas, sem alegar resultados não consultados e com fallback sempre seguro para full.", True)
doc.add_paragraph()
doc.add_heading("Princípios", level=1)
for item in [
    "O gpt-5.6-luna classifica todos os turnos; não existe classificação determinística local.",
    "Necessidade de resposta e relevância dos pills são decisões independentes.",
    "Ações externas apenas preparam navegação; nunca são apresentadas como resultados já obtidos.",
    "No Clássico, corpus é proibido e sempre rebaixado para full.",
    "Timeout, erro de rede ou JSON inválido seguem transparentemente para full.",
]:
    bullet(item)

doc.add_page_break()
doc.add_heading("1. Operação do classificador", level=1)
table(["Parâmetro", "Contrato"], [
    ("Modelo", "gpt-5.6-luna"),
    ("Raciocínio", "reasoningEffort: none"),
    ("Verbosidade", "low"),
    ("Saída", "JSON estrito via Responses API"),
    ("Timeout", "6.000 ms; falha → full"),
    ("Contexto", "pergunta anterior ≤ 500; resposta anterior ≤ 900; estado das fontes; apresentação; pergunta atual"),
], [4.2, 12.2])
doc.add_heading("Modalidades de resposta", level=2)
table(["responseMode", "Uso"], [
    ("full", "Padrão obrigatório para dúvidas conceituais, factuais, explicativas, comparativas, sínteses e redação."),
    ("action_only", "Ação ou navegação explicitamente pedida; exige ação válida e alta confiança."),
    ("direct", "Saudação, despedida, agradecimento, funcionamento do ConsBOT ou list_sources."),
    ("clarify", "Pergunta curta quando falta detalhe factual crucial."),
    ("corpus", "Somente trechos brutos explicitamente pedidos no modo Citações; proibido no Clássico."),
], [3.6, 12.8])
doc.add_paragraph("O campo legado route continua sendo gravado como derivação: action_only → direct; os demais mantêm a modalidade equivalente quando ela existe.")

doc.add_heading("Defesa em profundidade", level=2)
table(["Condição", "Resultado local"], [
    ("responseConfidence < 0,55", "Força full."),
    ("0,55 ≤ confiança < 0,78", "direct, action_only e clarify viram full; pills confiáveis permanecem."),
    ("confidence da ação < 0,55", "Ação descartada."),
    ("action_only sem ação válida", "Força full."),
    ("corpus no Clássico", "Força full; nunca converte para direct."),
], [6.2, 10.2])

doc.add_page_break()
doc.add_heading("2. Coerência da resposta com os pills", level=1)
for item in [
    "Em pedido operacional, o Luna escreve introdução curta que descreve o que será aberto.",
    "São proibidas alegações como “encontrei”, “não encontrei”, “não existe”, contagens ou descrições de resultados antes da consulta ao destino.",
    "Introdução vazia, longa ou com alegação de resultado é substituída pela frase neutra do catálogo.",
    "Em full, o modelo principal recebe contexto confiável com serviço, escopo e estado “ainda não consultado”.",
    "Ausência no RAG atual deve ser formulada como “não localizado nas fontes consultadas nesta resposta”, distinguindo-a de inexistência.",
]:
    bullet(item)
doc.add_heading("Exemplos válidos", level=2)
table(["Ação", "Introdução neutra"], [
    ("Busca em livros", "A busca literal por “tenepes” nos livros está preparada abaixo."),
    ("Bibliografia", "A referência de Projeciologia pode ser montada no módulo indicado."),
    ("Bibliomancia", "O sorteio de uma ortopensata pode ser iniciado pela opção abaixo."),
    ("ICGE", "A área pertinente do ICGE pode ser aberta abaixo."),
], [4.2, 12.2])
doc.add_heading("Apresentação", level=2)
bullet("No máximo três pills por turno, na mesma linha quando houver espaço.")
bullet("Fundo branco, rótulo curto, foco visível e descrição completa no atributo title.")
bullet("Pill de continuidade segue o mesmo padrão visual e permanece controlável no menu ADMIN.")

doc.add_page_break()
doc.add_heading("3. Catálogo de capacidades", level=1)
table(["Intent", "Política", "Finalidade"], [
    ("search_book", "fulfills_explicit_action", "Busca literal em livros e tratados."),
    ("search_verbete", "fulfills_explicit_action", "Busca em texto, título, autor ou especialidade."),
    ("search_conscienciograma", "fulfills_explicit_action", "Busca literal na página própria do CCG."),
    ("bibliografia_livros", "fulfills_explicit_action", "Referência de livros por sigla."),
    ("bibliografia_verbetes", "fulfills_explicit_action", "Referências de verbetes."),
    ("consulta_lexicons", "fulfills_explicit_action", "Consulta padrão em Cosmovisão."),
    ("bibliomancia", "fulfills_explicit_action", "Sorteio de ortopensata."),
    ("encyclossapiens", "complementary", "Escrita e submissão de verbetes."),
    ("icge", "complementary", "Macroáreas institucionais do ICGE."),
    ("open_resource", "fulfills_explicit_action", "Destino explicitamente pedido."),
    ("list_sources", "local", "Lista fontes carregadas sem modelo principal."),
], [4.1, 4.4, 7.9])
doc.add_heading("Recursos sob open_resource", level=2)
doc.add_paragraph("Periódicos, Enciclopédia/downloads, livros em PDF, Quiz, Flashcards, ConsGPT e ConsLM. ConsGPT e ConsLM nunca são promovidos espontaneamente.")

doc.add_page_break()
doc.add_heading("4. Contratos de deep link", level=1)
table(["Serviço", "Contrato"], [
    ("Livros", "index_search_book.html?q=<termo>&books=<book_code>"),
    ("Verbetes", "index_search_verb.html?q=<termo>&field=<texto|titulo|autor|especialidade>"),
    ("Conscienciograma", "index_search_ccg.html?q=<termo>"),
    ("Bibliografia de livros", "index_biblio_wv.html?sigla=<sigla>&style=<bee|simples>"),
    ("Bibliografia de verbetes", "index_biblio_verbete.html?q=<títulos>&style=<bee|simples>"),
    ("Bibliomancia", "index_mancia.html?autostart=1"),
    ("LexiCons", "?q=<termo>&autostart=1; sem parâmetro de modo"),
], [4.6, 11.8])
doc.add_heading("Identificadores de obras", level=2)
table(["Main-Server", "Cons-IA", "Sigla bibliográfica", "Obra"], [
    ("TEAT", "TEAT", "TEAT", "200 Teáticas"),
    ("EXP", "EXP", "EXP", "700 Experimentos"),
    ("DAC", "DAC", "DAC", "Dicionário de Argumentos"),
    ("HSP", "HSP", "HSP", "Homo sapiens pacificus"),
    ("HSR", "HSR", "HSR", "Homo sapiens reurbanisatus"),
    ("LO", "LO", "LO", "Léxico de Ortopensatas"),
    ("MDE", "MDE", "MDE", "Manual da Dupla Evolutiva"),
    ("MP", "MP", "MP", "Manual da Proéxis"),
    ("TNP", "TNP", "TNP", "Manual da Tenepes"),
    ("PROJ", "PROJ", "PROJ", "Projeciologia"),
    ("TC", "TC", "TC", "Temas da Conscienciologia"),
    ("MINI_ARLINDO", "MINI_ARLINDO", "—", "Minitertúlia — Arlindo"),
    ("PROJ1986", "PROJ1986", "—", "Projeciologia (1986)"),
    ("QUEST", "QUEST", "—", "Questões Mini"),
    ("ZEFIRO", "ZEFIRO", "—", "Zéfiro"),
], [3.2, 3.2, 3.4, 6.6])
doc.add_paragraph("Migração local: 700EXP→EXP; DUPLA→MDE; PROEXIS→MP; TEMAS→TC; 200TEAT→TEAT. O Conscienciograma permanece em página própria.")

doc.add_page_break()
doc.add_heading("5. ICGE — macroáreas oficiais", level=1)
table(["area", "Destino", "Página"], [
    ("", "Página inicial", "icge.org.br"),
    ("agenda", "Agenda Conscienciologia", "?page_id=6051"),
    ("instituicoes", "Instituições Conscienciocêntricas", "?page_id=6611"),
    ("publicacoes", "Publicações da CCCI", "?page_id=1417"),
    ("enciclopedia", "Verbetoteca", "?page_id=13493"),
    ("memoria", "Arquivos de Imprensa e Vídeos da CCCI", "?page_id=2585"),
    ("videos", "Ferramenta de Busca em Vídeos", "?page_id=9973"),
    ("autopesquisa", "Planilhas de Autopesquisa", "?page_id=1385"),
    ("holociclo", "Histórico do Holociclo", "?page_id=12238"),
], [3.2, 8.6, 4.6])
doc.add_paragraph("Perguntas substantivas usam full com pill específico. Apenas pedidos explícitos como “abra”, “acesse” ou “mostre o site” podem usar action_only. Destinos mais específicos caem na macroárea mais próxima ou na página inicial.")

doc.add_heading("LexiCons", level=2)
bullet("q + autostart=1 preenche e executa a consulta uma única vez, inclusive sob React Strict Mode.")
bullet("O hero é ocultado e o modo inicial permanece obrigatoriamente cosmovisao.")
bullet("Nenhum pill seleciona definição, etimologia ou outro módulo específico.")

doc.add_page_break()
doc.add_heading("6. Telemetria e compatibilidade", level=1)
for item in [
    "Um turnId comum relaciona decisão, impressão, clique e feedback.",
    "Registra responseMode proposto/efetivo, confiança global e duração do Luna.",
    "Cada ação registra confidence, posição, serviço, destino e parâmetros.",
    "Impressões são deduplicadas por mensagem, intent e URL, mesmo após rerenders.",
    "Metadata antiga com route/actions continua legível; novos turnos gravam o formato ampliado.",
    "route permanece no metadata como campo derivado durante a transição.",
]:
    bullet(item)
doc.add_heading("Fallbacks seguros", level=2)
table(["Falha", "Comportamento"], [
    ("Timeout > 6 s", "full"),
    ("Rede / HTTP", "full"),
    ("JSON ausente ou inválido", "full"),
    ("Confiança global inválida", "full"),
    ("Parâmetro ou destino fora do enum", "Ação descartada ou valor seguro; nunca URL arbitrária"),
], [6.0, 10.4])

doc.add_page_break()
doc.add_heading("7. Verificação e critérios de aceitação", level=1)
for item in [
    "Nenhum pill aponta para fonte, filtro ou bibliografia diferente do rótulo.",
    "Nenhuma pergunta substantiva é substituída por navegação.",
    "Nenhuma introdução afirma resultados de consulta não realizada.",
    "LexiCons sempre abre em Cosmovisão.",
    "ICGE abre uma das oito macroáreas ou a página inicial.",
    "Erro ou timeout do Luna sempre termina em full.",
]:
    bullet(item)
doc.add_heading("Cobertura automatizada", level=2)
doc.add_paragraph("OminIA: modalidades, confiança global/ação, coerência, contexto do modelo principal, URLs, ICGE e compatibilidade. Cons-IA: migração de códigos e campos estruturados. LexiCons: q + autostart, Cosmovisão fixa e proteção de execução única.")
doc.add_heading("Suíte ao vivo", level=2)
doc.add_paragraph("Avalia separadamente modalidade de resposta, intent, parâmetros e URL. Inclui positivos, negativos, multi-intent, anáforas, erros de digitação, português/inglês, prompt injection, ICGE e recursos explícitos. A presença de pill não implica direct.")

doc.core_properties.title = "Agent Mode — Clássico"
doc.core_properties.subject = "Regras e contratos do classificador ConsBOT Luna"
doc.core_properties.author = "ConsBOT"
doc.save(OUTPUT)
print(OUTPUT)
