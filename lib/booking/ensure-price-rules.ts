import { PRICE_RULE_TEMPLATES } from "@/lib/booking/price-rule-catalog";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Ensures each operator has one row per predefined price rule template.
 */
export async function ensureOperatorPriceRules(
  operatorId: string,
): Promise<void> {
  const supabase = createServiceRoleClient();

  const { data: existing, error } = await supabase
    .from("price_rules")
    .select("rule_key")
    .eq("operator_id", operatorId);

  if (error) throw error;

  const existingKeys = new Set((existing ?? []).map((r) => r.rule_key));
  const toInsert = PRICE_RULE_TEMPLATES.filter(
    (t) => !existingKeys.has(t.rule_key),
  ).map((template) => ({
    operator_id: operatorId,
    rule_key: template.rule_key,
    name: template.name,
    description: template.description,
    rule_type: template.rule_type,
    value: template.default_value,
    is_active: template.default_active,
    time_start: template.time_start,
    time_end: template.time_end,
  }));

  if (toInsert.length === 0) return;

  const { error: insertError } = await supabase
    .from("price_rules")
    .insert(toInsert);

  if (insertError) throw insertError;
}
