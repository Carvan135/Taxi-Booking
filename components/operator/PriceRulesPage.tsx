"use client";

import { DollarSign, Loader2, Pencil } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { BasePricingModal } from "@/components/operator/BasePricingModal";
import { PredefinedPriceRuleModal } from "@/components/operator/PredefinedPriceRuleModal";
import { Button } from "@/components/ui/Button";
import {
  PRICE_RULE_TEMPLATES,
  getPriceRuleTemplate,
} from "@/lib/booking/price-rule-catalog";
import { RULE_TYPE } from "@/lib/validations/enums";
import {
  useBasePricing,
  useOperator,
  usePriceRules,
  useUpdateBasePricing,
  useUpdatePriceRule,
} from "@/hooks/queries";
import type { BasePricingFormData, PredefinedPriceRuleFormData } from "@/lib/validations";
import { PLACEHOLDER } from "@/lib/format/display";
import type { PriceRule } from "@/types";

function formatGbp(amount: number | undefined): string {
  if (amount == null || Number.isNaN(amount)) return PLACEHOLDER;
  return `£${Number(amount).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function ruleValueLabel(rule: PriceRule): string {
  if (rule.rule_type === RULE_TYPE.multiplier) {
    return `${rule.value}x`;
  }
  return formatGbp(rule.value);
}

export function PriceRulesPage() {
  const { data: operator, isLoading: operatorLoading } = useOperator();
  const operatorId = operator?.id ?? "";

  const { data: rules = [], isLoading: rulesLoading, refetch } = usePriceRules(operatorId);
  const { data: basePricing, isLoading: pricingLoading } =
    useBasePricing(operatorId);

  const updateRule = useUpdatePriceRule();
  const updateBasePricing = useUpdateBasePricing();

  const [editingRule, setEditingRule] = useState<PriceRule | null>(null);
  const [baseModalOpen, setBaseModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const syncTemplates = useCallback(async () => {
    if (!operatorId) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/operator/sync-price-rules", {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Could not load price rule templates");
      }
      await refetch();
    } finally {
      setSyncing(false);
    }
  }, [operatorId, refetch]);

  useEffect(() => {
    if (operatorId) {
      void syncTemplates();
    }
  }, [operatorId, syncTemplates]);

  const isLoading = operatorLoading || rulesLoading || pricingLoading || syncing;

  const rulesByKey = new Map(rules.map((r) => [r.rule_key, r]));

  async function handleSaveRule(values: PredefinedPriceRuleFormData) {
    if (!operatorId || !editingRule) return;
    setFormError(null);
    const template = getPriceRuleTemplate(values.rule_key);
    try {
      await updateRule.mutateAsync({
        id: editingRule.id,
        operatorId,
        updates: {
          value: values.value,
          is_active: values.is_active,
          ...(template?.rule_key === "out_of_hours"
            ? {
                time_start: values.time_start ?? null,
                time_end: values.time_end ?? null,
              }
            : {}),
        },
      });
      setEditingRule(null);
    } catch (e) {
      setFormError(
        e instanceof Error ? e.message : "Could not save price rule.",
      );
      throw e;
    }
  }

  async function handleSaveBasePricing(values: BasePricingFormData) {
    if (!operatorId) return;
    setFormError(null);
    try {
      await updateBasePricing.mutateAsync({
        operatorId,
        pricing: values,
      });
      setBaseModalOpen(false);
    } catch (e) {
      setFormError(
        e instanceof Error ? e.message : "Could not save base pricing.",
      );
      throw e;
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-content">
          Price Rules
        </h1>
        <p className="mt-2 text-sm text-content/65">
          Base meter rates plus predefined surcharges applied automatically at
          booking time.
        </p>
      </header>

      {formError ? (
        <p
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {formError}
        </p>
      ) : null}

      {isLoading ? (
        <p className="mt-10 flex items-center gap-2 text-sm text-content/60">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading pricing…
        </p>
      ) : (
        <>
          <section className="mt-8 space-y-4">
            {PRICE_RULE_TEMPLATES.map((template) => {
              const rule = rulesByKey.get(template.rule_key);
              if (!rule) return null;

              return (
                <article
                  key={template.rule_key}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold text-content">
                          {template.name}
                        </h2>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            rule.is_active
                              ? "bg-slate-900 text-white"
                              : "bg-white text-content/70 ring-1 ring-slate-300"
                          }`}
                        >
                          {rule.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-content/65">
                        {template.description}
                      </p>
                      <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-content">
                        <DollarSign
                          className="h-4 w-4 text-content/40"
                          aria-hidden
                        />
                        {ruleValueLabel(rule)}
                        {rule.rule_key === "out_of_hours" && rule.is_active ? (
                          <span className="text-content/50">
                            · {rule.time_start?.slice(0, 5)}–
                            {rule.time_end?.slice(0, 5)}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditingRule(rule)}
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                      Configure
                    </Button>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-content">Base pricing</h2>
            <p className="mt-1 text-sm text-content/60">
              Fare = base + (miles × per mile) + (minutes × per minute), with
              minimum fare per leg.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  { label: "Base fare", value: basePricing?.base_fare },
                  { label: "Per mile", value: basePricing?.per_mile },
                  { label: "Per minute", value: basePricing?.per_minute },
                  { label: "Minimum fare", value: basePricing?.minimum_fare },
                ] as const
              ).map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl bg-slate-50 px-4 py-4 ring-1 ring-slate-100"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-content/50">
                    {item.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-content">
                    {formatGbp(item.value)}
                  </p>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="secondary"
              className="mt-5 w-full"
              onClick={() => setBaseModalOpen(true)}
              disabled={!operatorId}
              size="sm"
            >
              Update base pricing
            </Button>
          </section>
        </>
      )}

      <PredefinedPriceRuleModal
        open={Boolean(editingRule)}
        rule={editingRule}
        onClose={() => setEditingRule(null)}
        onSave={handleSaveRule}
        isSaving={updateRule.isPending}
      />

      <BasePricingModal
        open={baseModalOpen}
        pricing={basePricing ?? null}
        onClose={() => setBaseModalOpen(false)}
        onSave={handleSaveBasePricing}
        isSaving={updateBasePricing.isPending}
      />
    </div>
  );
}

