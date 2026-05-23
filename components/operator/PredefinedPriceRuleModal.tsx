"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { BOOK_TRIP_INPUT_CLASS } from "@/components/booking/booking-form-styles";
import { getPriceRuleTemplate } from "@/lib/booking/price-rule-catalog";
import {
  predefinedPriceRuleSchema,
  type PredefinedPriceRuleFormData,
} from "@/lib/validations/booking";
import { RULE_TYPE } from "@/lib/validations/enums";
import type { PriceRule } from "@/types";

type PredefinedPriceRuleModalProps = {
  open: boolean;
  rule: PriceRule | null;
  onClose: () => void;
  onSave: (values: PredefinedPriceRuleFormData) => Promise<void>;
  isSaving: boolean;
};

export function PredefinedPriceRuleModal({
  open,
  rule,
  onClose,
  onSave,
  isSaving,
}: PredefinedPriceRuleModalProps) {
  const template = rule ? getPriceRuleTemplate(rule.rule_key) : undefined;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PredefinedPriceRuleFormData>({
    resolver: zodResolver(
      predefinedPriceRuleSchema,
    ) as unknown as Resolver<PredefinedPriceRuleFormData>,
    defaultValues: {
      rule_key: "",
      value: 1,
      is_active: false,
      time_start: "22:00",
      time_end: "06:00",
    },
  });

  const isActive = watch("is_active");
  const isMultiplier = template?.rule_type === RULE_TYPE.multiplier;
  const isOutOfHours = rule?.rule_key === "out_of_hours";

  useEffect(() => {
    if (!open || !rule) return;
    reset({
      rule_key: rule.rule_key,
      value: rule.value,
      is_active: rule.is_active,
      time_start: rule.time_start?.slice(0, 5) ?? "22:00",
      time_end: rule.time_end?.slice(0, 5) ?? "06:00",
    });
  }, [open, rule, reset]);

  const onSubmit = handleSubmit(async (values) => {
    await onSave(values);
  });

  if (!rule || !template) return null;

  return (
    <Modal
      open={open}
      title={template.name}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} size="sm">
            Cancel
          </Button>
          <Button type="submit" form="predefined-rule-form" loading={isSaving} size="sm">
            Save
          </Button>
        </>
      }
    >
      <form
        id="predefined-rule-form"
        onSubmit={onSubmit}
        className="space-y-4"
        noValidate
      >
        <p className="text-sm text-content/65">{template.description}</p>

        <label className="flex items-center gap-2 text-sm font-medium text-content">
          <input type="checkbox" className="rounded" {...register("is_active")} />
          Active
        </label>

        <div>
          <label htmlFor="rule-value" className="text-sm font-medium text-content">
            {isMultiplier ? "Multiplier (e.g. 1.25 = +25%)" : "Fixed fee (£)"}
          </label>
          <input
            id="rule-value"
            type="number"
            step={isMultiplier ? "0.01" : "0.01"}
            min={isMultiplier ? "1" : "0.01"}
            max={isMultiplier ? "5" : undefined}
            className={BOOK_TRIP_INPUT_CLASS}
            {...register("value", { valueAsNumber: true })}
          />
          {errors.value?.message ? (
            <p className="mt-1.5 text-sm text-red-600" role="alert">
              {errors.value.message}
            </p>
          ) : null}
        </div>

        {isOutOfHours && isActive ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="time_start" className="text-sm font-medium text-content">
                From
              </label>
              <input
                id="time_start"
                type="time"
                className={BOOK_TRIP_INPUT_CLASS}
                {...register("time_start")}
              />
              {errors.time_start?.message ? (
                <p className="mt-1.5 text-sm text-red-600">{errors.time_start.message}</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="time_end" className="text-sm font-medium text-content">
                Until
              </label>
              <input
                id="time_end"
                type="time"
                className={BOOK_TRIP_INPUT_CLASS}
                {...register("time_end")}
              />
              {errors.time_end?.message ? (
                <p className="mt-1.5 text-sm text-red-600">{errors.time_end.message}</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
