import type { Prospect } from "./schema";

/**
 * sete77 — adaptações do fork para a SDR Helena.
 *
 * Os candidatos que vêm do nosso analista externo (scraper do Maps + IA) chegam
 * com `nota` preenchida. Para eles, a primeira mensagem NÃO é gerada por IA:
 * o método da Helena abre só com a saudação do horário e espera a resposta.
 * Candidato do provedor nativo (sem `nota`) segue o caminho original.
 */
export function veioDoAnalista(data: Partial<Prospect> | null | undefined): boolean {
  return typeof data?.nota === "number" && Number.isFinite(data.nota);
}

/** "Oi, bom dia! Tudo bem?" / "Oi, boa tarde! Tudo bem?" pelo relógio de Brasília. */
export function saudacaoDaHelena(agora: Date): string {
  const hora = Number(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(agora),
  );
  const periodo = hora < 12 ? "bom dia" : hora < 18 ? "boa tarde" : "boa noite";
  return `Oi, ${periodo}! Tudo bem?`;
}
