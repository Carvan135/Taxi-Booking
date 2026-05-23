"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { BOOK_TRIP_INPUT_CLASS } from "@/components/booking/booking-form-styles";
import {
  basePricingSchema,
  type BasePricingFormData,
} from "@/lib/validations";
import type { OperatorBasePricing } from "@/types";

type BasePricingModalProps = {
  open: boolean;
  pricing: OperatorBasePricing | null;
  onClose: () => void;
  onSave: (values: BasePricingFormData) => Promise<void>;
  isSaving: boolean;
};

const defaults: BasePricingFormData = {
  base_fare: 5,
  per_mile: 2.5,
  per_minute: 0.35,
  minimum_fare: 5,
};

export function BasePricingModal({
  open,
  pricing,
  onClose,
  onSave,
  isSaving,
}: BasePricingModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BasePricingFormData>({
    resolver: zodResolver(basePricingSchema) as unknown as Resolver<BasePricingFormData>,
    defaultValues: defaults,
  });

  useEffect(() => {
    if (!open) return;
    reset({
      base_fare: pricing?.base_fare ?? defaults.base_fare,
      per_mile: pricing?.per_mile ?? defaults.per_mile,
      per_minute: pricing?.per_minute ?? defaults.per_minute,
      minimum_fare: pricing?.minimum_fare ?? defaults.minimum_fare,
    });
  }, [open, pricing, reset]);

  return (
    <Modal
      open={open}
      title="Update base pricing"
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="base-pricing-form"
            loading={isSaving}
          >
            Save
          </Button>
        </>
      }
    >
      <form
        id="base-pricing-form"
        onSubmit={handleSubmit(onSave)}
        className="space-y-4"
        noValidate
      >
        {(
          [
            { id: "base_fare", label: "Base fare (£)" },
            { id: "per_mile", label: "Per mile (£)" },
            { id: "per_minute", label: "Per minute (£)" },
            { id: "minimum_fare", label: "Minimum fare (£)" },
          ] as const
        ).map((field) => (
          <div key={field.id}>
            <label htmlFor={field.id} className="text-sm font-medium text-content">
              {field.label}
            </label>
            <input
              id={field.id}
              type="number"
              step="0.01"
              min="0.01"
              className={BOOK_TRIP_INPUT_CLASS}
              {...register(field.id, { valueAsNumber: true })}
            />
            {errors[field.id]?.message ? (
              <p className="mt-1.5 text-sm text-red-600" role="alert">
                {errors[field.id]?.message}
              </p>
            ) : null}
          </div>
        ))}
      </form>
    </Modal>
  );
}
