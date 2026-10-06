import { describe, expect, it } from "vitest";
import { semCaracteresEstranhos } from "@/lib/agent-engine/agent/sete77-caracteres";
import { saudacaoDaHelena, veioDoAnalista } from "@/lib/prospecting/sete77";

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
