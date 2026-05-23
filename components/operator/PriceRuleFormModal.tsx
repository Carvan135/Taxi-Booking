"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { BOOK_TRIP_INPUT_CLASS } from "@/components/booking/booking-form-styles";
import {
  priceRuleSchema,
  type PriceRuleFormData,
} from "@/lib/validations";
import { RULE_TYPE } from "@/lib/validations/enums";
import type { RuleType } from "@/lib/validations/enums";
import type { PriceRule } from "@/types";

type PriceRuleFormModalProps = {
  open: boolean;
  editing: PriceRule | null;
  onClose: () => void;
  onSave: (values: PriceRuleFormData) => Promise<void>;
  isSaving: boolean;
};

const defaultValues: PriceRuleFormData = {
  name: "",
  description: "",
  rule_type: RULE_TYPE.multiplier,
  value: 1.2,
  is_active: true,
};

export function PriceRuleFormModal({
  open,
  editing,
  onClose,
  onSave,
  isSaving,
}: PriceRuleFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PriceRuleFormData>({
    resolver: zodResolver(priceRuleSchema) as unknown as Resolver<PriceRuleFormData>,
    defaultValues,
  });

  const ruleType = watch("rule_type");

  useEffect(() => {
    if (!open) return;
    if (editing) {
      reset({
        name: editing.name,
        description: editing.description ?? "",
        rule_type: editing.rule_type,
        value: editing.value,
        is_active: editing.is_active,
      });
    } else {
      reset(defaultValues);
    }
  }, [open, editing, reset]);

  const onSubmit = handleSubmit(async (values) => {
    await onSave(values);
  });

  return (
    <Modal
      open={open}
      title={editing ? "Edit price rule" : "Add new rule"}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} size="sm">
            Cancel
          </Button>
          <Button type="submit" form="price-rule-form" loading={isSaving} size="sm">
            Save
          </Button>
        </>
      }
    >
      <form id="price-rule-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="rule_name" className="text-sm font-medium text-content">
            Rule name
          </label>
          <input
            id="rule_name"
            className={BOOK_TRIP_INPUT_CLASS}
            {...register("name")}
          />
          {errors.name?.message ? (
            <p className="mt-1.5 text-sm text-red-600" role="alert">
              {errors.name.message}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="rule_description" className="text-sm font-medium text-content">
            Description <span className="text-content/45">(optional)</span>
          </label>
          <textarea
            id="rule_description"
            rows={3}
            className={`${BOOK_TRIP_INPUT_CLASS} resize-y`}
            {...register("description")}
          />
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-content">Rule type</legend>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {(
              [
                { type: RULE_TYPE.multiplier, label: "Multiplier" },
                { type: RULE_TYPE.fixed_fee, label: "Fixed Fee" },
              ] as const
            ).map(({ type, label }) => (
              <label
                key={type}
                className={`cursor-pointer rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                  ruleType === type
                    ? "border-secondary bg-sky-50 text-secondary ring-2 ring-secondary/30"
                    : "border-slate-200 bg-white text-content hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  className="sr-only"
                  value={type}
                  checked={ruleType === type}
                  onChange={() =>
                    setValue("rule_type", type as RuleType, {
                      shouldValidate: true,
                    })
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="rule_value" className="text-sm font-medium text-content">
            {ruleType === RULE_TYPE.multiplier
              ? "Multiplier (e.g. 1.2)"
              : "Fee amount (£)"}
          </label>
          <input
            id="rule_value"
            type="number"
            step={ruleType === RULE_TYPE.multiplier ? "0.05" : "0.01"}
            min={ruleType === RULE_TYPE.multiplier ? 1 : 0.01}
            className={BOOK_TRIP_INPUT_CLASS}
            {...register("value", { valueAsNumber: true })}
          />
          {errors.value?.message ? (
            <p className="mt-1.5 text-sm text-red-600" role="alert">
              {errors.value.message}
            </p>
          ) : null}
        </div>

        <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-sm font-medium text-content">Active</span>
          <input
            type="checkbox"
            className="h-5 w-5 rounded border-slate-300 text-secondary focus:ring-secondary"
            {...register("is_active")}
          />
        </label>
      </form>
    </Modal>
  );
}
