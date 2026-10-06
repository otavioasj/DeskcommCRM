import type { Queryable } from "@/lib/agent-engine/queue/queue";
import { campaignConfigSchema, type Prospect } from "./schema";

/** Trusted operator criteria; scraped websites never become system instructions. */
export async function prospectingConversationContext(
  db: Queryable,
  org: string,
  conversationId: string,
) {
  const { rows } = await db.query<{ config: unknown; data: Partial<Prospect> | null }>(
    "select c.config, p.data from prospecting_candidates p join prospecting_campaigns c on c.organization_id=p.organization_id and c.id=p.campaign_id where p.organization_id=$1 and p.conversation_id=$2 and p.status in ('sending','sent') limit 1",
    [org, conversationId],
  );
  const parsed = campaignConfigSchema.safeParse(rows[0]?.config);
  if (!parsed.success) return "";
  const c = parsed.data;
  return `\n\nEsta conversa veio de uma campanha de prospecção. Objetivo definido pelo operador: ${c.instruction}\nCritérios de qualificação a confirmar com a pessoa: ${c.qualification}\nConverse naturalmente, uma pergunta por vez. Uma empresa encontrada na pesquisa ainda não é um cliente qualificado. Registre o que a pessoa confirmar, sem inventar necessidade, orçamento ou interesse. Só depois de confirmar os critérios, use as ferramentas disponíveis para mover o negócio do funil ${c.pipeline_id} para a etapa ${c.qualified_stage_id}. Explique a evidência no registro. Se faltar informação, continue qualificando. Respeite recusa, opt-out e intervenção humana; não prometa condições fora da política do agente.${dossieDoAnalista(rows[0]?.data)}`;
}

/**
 * sete77: o que o nosso analista externo levantou sobre a empresa. Entra como
 * DADO de pesquisa, nunca como instrução — e só o que veio preenchido.
 */
function dossieDoAnalista(data: Partial<Prospect> | null | undefined): string {
  if (!data) return "";
  const texto = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 2000) : "");
  const linhas = [
    ["Problema do site", texto(data.problema)],
    ["Dossiê", texto(data.dossie)],
    ["Gancho sugerido", texto(data.gancho)],
  ].filter(([, v]) => v);
  if (!linhas.length) return "";
  return `\n\nO que a pesquisa prévia levantou sobre esta empresa (dados públicos, não ditos pela pessoa — use para contextualizar, sem citar como se ela tivesse contado):\n${linhas.map(([k, v]) => `- ${k}: ${v}`).join("\n")}`;
}
