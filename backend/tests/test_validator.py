"""Porte dos testes de tests/validar-relatorio.test.js (mapa-de-talentos) para o validador Python."""
from app.services import analysis

PESSOA = ["Eu vi que o preço estava errado.", "Eu conferi o troco e avisei."]
PROPOSTA = {"olho-clinico": list(PESSOA)}


def test_two_literal_quotes_from_distinct_lines_are_moderate():
    themes = analysis.validate(PROPOSTA, PESSOA)
    assert [t.name for t in themes] == ["Olho Clínico"]
    assert themes[0].confidence == "Moderado"


def test_three_quotes_are_strong():
    lines = PESSOA + ["Desconfiei da validade e conferi o lote."]
    themes = analysis.validate({"olho-clinico": lines}, lines)
    assert themes[0].confidence == "Forte"


def test_rejects_invented_quote_or_lia_line():
    lia = "Outra história?"
    assert analysis.validate({"olho-clinico": [PESSOA[0], lia]}, PESSOA) == []


def test_two_quotes_from_same_line_count_once():
    assert analysis.validate(PROPOSTA, [" ".join(PESSOA)]) == []


def test_ellipsis_parts_must_appear_in_order_in_same_line():
    assert analysis.validate({"olho-clinico": ["Eu vi... estava errado.", PESSOA[1]]}, PESSOA)
    assert analysis.validate({"olho-clinico": ["estava errado... Eu vi", PESSOA[1]]}, PESSOA) == []


def test_quotes_over_25_words_are_rejected():
    long_line = " ".join(["palavra"] * 30)
    assert analysis.validate({"olho-clinico": [long_line, PESSOA[1]]}, [long_line, PESSOA[1]]) == []


def test_generic_answers_produce_no_talents():
    lines = ["Eu sou bem esforçada.", "Sou organizada."]
    grouped, _ = analysis.lexical(lines)
    assert analysis.validate(grouped, lines) == []


def test_unknown_theme_is_ignored_and_tie_prefers_new_domain():
    lines = ["Organizei o estoque inteiro.", "Padronizei a escala.", "Puxei conversa com o cliente novo.",
             "Fiz amizade com o cliente da padaria.", "Criei uma lista de tarefas."]
    proposal = {"inexistente": lines, "tudo-no-lugar": [lines[0], lines[1]], "palavra-dada": [lines[4], lines[1]],
                "ponte": [lines[2], lines[3]]}
    names = [t.name for t in analysis.validate(proposal, lines)]
    assert names[:2] == ["Palavra Dada", "Ponte"] or names[:2] == ["Tudo no Lugar", "Ponte"]


def test_discovering_is_never_a_weakness_and_paths_need_quotes():
    themes = analysis.validate(PROPOSTA, PESSOA)
    d = analysis.discovering(themes, PROPOSTA)
    assert d and d.domain != "fazer" and d.invite.startswith("Quer contar")
    assert [p.name for p in analysis.paths([("Organizar e controlar", PESSOA[1]), ("Criar e expressar", "inventado")], PESSOA)] \
        == ["Organizar e controlar"]


def test_wellbeing_alert_detected():
    assert analysis.wellbeing_alert(["Tem dia que me dá vontade de morrer."])
    assert not analysis.wellbeing_alert(PESSOA)
