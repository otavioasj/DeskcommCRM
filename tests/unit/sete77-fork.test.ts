import { describe, expect, it } from "vitest";
import { semCaracteresEstranhos } from "@/lib/agent-engine/agent/sete77-caracteres";
import {
  lerTurnos,
  proximoTurno,
  saudacaoDaHelena,
  turnoAtual,
  turnosLigados,
  veioDoAnalista,
} from "@/lib/prospecting/sete77";

describe("sete77: trava de caracteres", () => {
  it("tira o lixo que o Luna soltou nos testes da Helena", () => {
    expect(semCaracteresEstranhos("o movimento tá movimentadoાંચ hoje")).toBe(
      "o movimento tá movimentado hoje",
    );
    expect(semCaracteresEstranhos("Entendi】【。 e aí?")).toBe("Entendi e aí?");
    expect(semCaracteresEstranhos("vamos ver сейчас isso")).toBe("vamos ver isso");
    expect(semCaracteresEstranhos("certo\tmsg pode ser")).toBe("certo pode ser");
  });

  it("mantém português, preço, emoji e quebra de linha", () => {
    const texto = "Oi, boa tarde! Tudo bem? 😊\n\nFica a partir de R$ 799 — ação, coração, nº 2 ✅";
    expect(semCaracteresEstranhos(texto)).toBe(texto);
  });
});

describe("sete77: prospecção do analista", () => {
  it("só reconhece lead do analista pela nota numérica", () => {
    expect(veioDoAnalista({ nota: 8 })).toBe(true);
    expect(veioDoAnalista({ nota: 0 })).toBe(true);
    expect(veioDoAnalista({})).toBe(false);
    expect(veioDoAnalista(null)).toBe(false);
  });

  it("saúda pelo horário de Brasília", () => {
    expect(saudacaoDaHelena(new Date("2026-10-06T12:30:00Z"))).toBe("Oi, bom dia! Tudo bem?"); // 9h30
    expect(saudacaoDaHelena(new Date("2026-10-06T14:59:00Z"))).toBe("Oi, bom dia! Tudo bem?"); // 11h59
    expect(saudacaoDaHelena(new Date("2026-10-06T15:00:00Z"))).toBe("Oi, boa tarde! Tudo bem?"); // 12h
    expect(saudacaoDaHelena(new Date("2026-10-06T20:59:00Z"))).toBe("Oi, boa tarde! Tudo bem?"); // 17h59
  });
});

describe("sete77: turnos de 9h e 14h", () => {
  const zero = () => 0;
  const T = lerTurnos("9-11/5,14-16/5");
  it("lê a configuração e desliga sem ela", () => {
    expect(T).toEqual([
      { hora: 9, minutos: 120, max: 5 },
      { hora: 14, minutos: 120, max: 5 },
    ]);
    expect(turnosLigados([])).toBe(false);
    expect(lerTurnos("9h às 11h")).toEqual([]);
    expect(lerTurnos(undefined)).toEqual([]);
  });
  it("reconhece os turnos em dia útil, no horário de Brasília", () => {
    // 2026-10-12 é segunda. 9h30 BRT = 12h30 UTC.
    expect(turnoAtual(new Date("2026-10-12T12:30:00Z"), T)?.max).toBe(5);
    expect(turnoAtual(new Date("2026-10-12T17:10:00Z"), T)?.inicio.toISOString()).toBe(
      "2026-10-12T17:00:00.000Z",
    ); // 14h10
    expect(turnoAtual(new Date("2026-10-12T15:00:00Z"), T)).toBeNull(); // 12h, entre turnos
    expect(turnoAtual(new Date("2026-10-12T19:30:00Z"), T)).toBeNull(); // 16h30
    expect(turnoAtual(new Date("2026-10-10T12:30:00Z"), T)).toBeNull(); // sábado
  });

  it("aponta o próximo turno, pulando fim de semana", () => {
    expect(proximoTurno(new Date("2026-10-12T15:00:00Z"), zero, T).toISOString()).toBe(
      "2026-10-12T17:00:00.000Z",
    ); // segunda 12h -> 14h
    expect(proximoTurno(new Date("2026-10-12T19:00:00Z"), zero, T).toISOString()).toBe(
      "2026-10-13T12:00:00.000Z",
    ); // segunda 16h -> terça 9h
    expect(proximoTurno(new Date("2026-10-09T19:00:00Z"), zero, T).toISOString()).toBe(
      "2026-10-12T12:00:00.000Z",
    ); // sexta 16h -> segunda 9h
  });
});
