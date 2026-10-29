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

/**
 * Saudação pelo relógio de Brasília, sorteada entre versões naturais. Texto
 * idêntico para muita gente desconhecida é assinatura de spam para o WhatsApp
 * (decisão de 13/10/2026, ao subir o volume). `aleatorio` existe para o teste.
 */
const SAUDACOES = [
  (p: string) => `Oi, ${p}! Tudo bem?`,
  (p: string) => `${p[0]!.toUpperCase()}${p.slice(1)}! Tudo bem por aí?`,
  (p: string) => `Oi, ${p}, tudo certo?`,
  (p: string) => `Olá, ${p}! Tudo bem?`,
  (p: string) => `${p[0]!.toUpperCase()}${p.slice(1)}, tudo bem?`,
];

/**
 * sete77 (29/10/2026): lead da Colômbia (+57) recebe a saudação em espanhol, pelo relógio de Bogotá.
 */
const SALUDOS = [
  (p: string) => `Hola, ${p}! ¿Cómo está?`,
  (p: string) => `${p[0]!.toUpperCase()}${p.slice(1)}, ¿cómo le va?`,
  (p: string) => `Hola, ${p}, ¿cómo está?`,
  (p: string) => `¡${p[0]!.toUpperCase()}${p.slice(1)}! ¿Cómo va todo?`,
  (p: string) => `Hola, ${p}. ¿Cómo está?`,
];

export function ehDaColombia(telefone: string | null | undefined): boolean {
  return String(telefone ?? "").startsWith("+57");
}

export function saudacaoDaHelena(
  agora: Date,
  aleatorio: () => number = Math.random,
  telefone?: string | null,
): string {
  const co = ehDaColombia(telefone);
  const hora = Number(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: co ? "America/Bogota" : "America/Sao_Paulo",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(agora),
  );
  if (co) {
    const periodo = hora < 12 ? "buenos días" : hora < 18 ? "buenas tardes" : "buenas noches";
    const i = Math.min(SALUDOS.length - 1, Math.floor(aleatorio() * SALUDOS.length));
    return SALUDOS[i]!(periodo);
  }
  const periodo = hora < 12 ? "bom dia" : hora < 18 ? "boa tarde" : "boa noite";
  const i = Math.min(SAUDACOES.length - 1, Math.floor(aleatorio() * SAUDACOES.length));
  return SAUDACOES[i]!(periodo);
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
/** sete77 (29/10/2026): campanha com "Colômbia" no nome roda os turnos no relógio de Bogotá (UTC−5, sem horário de verão). */
export const FUSO_BOGOTA_MS = -5 * 3_600_000;
export function fusoDaCampanha(nome: string | null | undefined): number {
  return /col[oô]mbia/i.test(nome ?? "") ? FUSO_BOGOTA_MS : FUSO_MS;
}

function emBrasilia(d: Date, fuso = FUSO_MS): Date {
  return new Date(d.getTime() + fuso); // usar só os getters UTC deste Date
}
function diaUtil(local: Date): boolean {
  const dia = local.getUTCDay();
  return dia >= 1 && dia <= 5;
}
function inicioDoTurno(local: Date, hora: number, fuso = FUSO_MS): Date {
  return new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), hora) - fuso,
  );
}

/** Turnos ligados? Sem `PROSPECCAO_TURNOS`, a esteira não passa por nada disto. */
export function turnosLigados(turnos: Turno[] = turnosDoAmbiente()): boolean {
  return turnos.length > 0;
}

export function turnoAtual(
  agora: Date,
  turnos: Turno[] = turnosDoAmbiente(),
  fuso = FUSO_MS,
): { inicio: Date; fim: Date; max: number } | null {
  const local = emBrasilia(agora, fuso);
  if (!diaUtil(local)) return null;
  for (const t of turnos) {
    const inicio = inicioDoTurno(local, t.hora, fuso);
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
  fuso = FUSO_MS,
): Date {
  for (let dias = 0; dias < 8; dias++) {
    const local = emBrasilia(new Date(depois.getTime() + dias * 86_400_000), fuso);
    if (!diaUtil(local)) continue;
    for (const t of turnos) {
      const inicio = inicioDoTurno(local, t.hora, fuso);
      if (inicio.getTime() >= depois.getTime())
        return new Date(inicio.getTime() + Math.floor(aleatorio() * 10 * 60_000));
    }
  }
  return new Date(depois.getTime() + 86_400_000);
}
