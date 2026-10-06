/**
 * sete77 — trava de caracteres de outro alfabeto na saída do agente.
 *
 * O GPT-5.6 Luna, modelo da nossa SDR, solta de vez em quando lixo de outro
 * alfabeto no meio da frase ("movimentadoાંચ", "】【。", "сейчас", "\tmsg").
 * Medido nos testes da Helena: 4 de 6 conversas numa rodada. Mensagem assim no
 * WhatsApp de um desconhecido denuncia robô na hora.
 *
 * Fica o que um português escrito usa: latim (com acentos), pontuação, moeda,
 * setas, símbolos e emoji. Sai o resto, e sai o "\t" seguido de palavra que o
 * modelo cola como resto de formatação. Mesma regra de
 * `scripts/scraper/pesquisar-leads.py` (repositório da Sete77).
 */
function permitido(codigo: number): boolean {
  return (
    codigo < 0x250 ||
    (codigo >= 0x2000 && codigo <= 0x206f) ||
    (codigo >= 0x20a0 && codigo <= 0x20cf) ||
    (codigo >= 0x2190 && codigo <= 0x21ff) ||
    (codigo >= 0x2600 && codigo <= 0x27bf) ||
    (codigo >= 0xfe00 && codigo <= 0xfe0f) ||
    codigo >= 0x1f000
  );
}

export function semCaracteresEstranhos(texto: string): string {
  let saida = "";
  for (const ch of texto.replace(/\t\S*/g, "")) {
    if (permitido(ch.codePointAt(0) ?? 0)) saida += ch;
  }
  return saida.replace(/[ ]{2,}/g, " ").trim();
}
