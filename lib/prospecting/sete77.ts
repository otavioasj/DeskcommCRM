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

/**
 * Turnos de envio da prospecção, decisão do Otávio em 08/10/2026: duas levas por
 * dia útil, às 9h e às 14h (horário de Brasília), até 5 abordagens por turno em
 * cada número (no servidor: PROSPECCAO_TURNOS="9-11/5,14-16/5"). Dentro do turno o espaçamento é o intervalo da campanha (com o
 * jitter da esteira fria). Brasília não tem horário de verão desde 2019: UTC−3.
 */
export interface Turno {
  hora: number;
  minutos: number;
  max: number;
}
/**
 * Lidos de `PROSPECCAO_TURNOS` no formato "9-11/5,14-16/5" (hora de início, hora
 * de fim, máximo de envios). Sem a variável, não há turnos e a esteira segue o
 * comportamento original do CRM. Formato inválido = sem turnos.
 */
export function lerTurnos(valor: string | undefined): Turno[] {
  if (!valor?.trim()) return [];
  const turnos: Turno[] = [];
  for (const parte of valor.split(",")) {
    const m = /^\s*(\d{1,2})-(\d{1,2})\/(\d{1,3})\s*$/.exec(parte);
    if (!m) return [];
    const [ini, fim, max] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (!(ini >= 0 && fim <= 24 && fim > ini && max >= 1)) return [];
    turnos.push({ hora: ini, minutos: (fim - ini) * 60, max });
  }
  return turnos;
}
const turnosDoAmbiente = (): Turno[] => lerTurnos(process.env.PROSPECCAO_TURNOS);
const FUSO_MS = -3 * 3_600_000;

function emBrasilia(d: Date): Date {
  return new Date(d.getTime() + FUSO_MS); // usar só os getters UTC deste Date
}
function diaUtil(local: Date): boolean {
  const dia = local.getUTCDay();
  return dia >= 1 && dia <= 5;
}
function inicioDoTurno(local: Date, hora: number): Date {
  return new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), hora) - FUSO_MS,
  );
}

/** Turnos ligados? Sem `PROSPECCAO_TURNOS`, a esteira não passa por nada disto. */
export function turnosLigados(turnos: Turno[] = turnosDoAmbiente()): boolean {
  return turnos.length > 0;
}

export function turnoAtual(
  agora: Date,
  turnos: Turno[] = turnosDoAmbiente(),
): { inicio: Date; fim: Date; max: number } | null {
  const local = emBrasilia(agora);
  if (!diaUtil(local)) return null;
  for (const t of turnos) {
    const inicio = inicioDoTurno(local, t.hora);
    const fim = new Date(inicio.getTime() + t.minutos * 60_000);
    if (agora >= inicio && agora < fim) return { inicio, fim, max: t.max };
  }
  return null;
}

/** Início do próximo turno depois de `depois`, com até 10 min de folga aleatória. */
export function proximoTurno(
  depois: Date,
  aleatorio: () => number = Math.random,
  turnos: Turno[] = turnosDoAmbiente(),
): Date {
  for (let dias = 0; dias < 8; dias++) {
    const local = emBrasilia(new Date(depois.getTime() + dias * 86_400_000));
    if (!diaUtil(local)) continue;
    for (const t of turnos) {
      const inicio = inicioDoTurno(local, t.hora);
      if (inicio.getTime() >= depois.getTime())
        return new Date(inicio.getTime() + Math.floor(aleatorio() * 10 * 60_000));
    }
  }
  return new Date(depois.getTime() + 86_400_000);
}
