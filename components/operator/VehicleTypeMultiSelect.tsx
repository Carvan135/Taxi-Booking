"use client";

import { OPERATOR_FLEET_VEHICLE_TYPES } from "@/lib/operator/fleet-vehicle-types";

type VehicleTypeMultiSelectProps = {
  id?: string;
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
  errorId?: string;
};

export function VehicleTypeMultiSelect({
  id = "fleet_vehicle_types",
  value,
  onChange,
  error,
  errorId,
}: VehicleTypeMultiSelectProps) {
  function toggle(type: string) {
    if (value.includes(type)) {
      onChange(value.filter((item) => item !== type));
      return;
    }
    onChange([...value, type]);
  }

  return (
    <div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-content">
          Vehicle types you provide *
        </legend>
        <p className="mb-3 text-xs leading-relaxed text-content/65">
          Select every vehicle category in your fleet. Customers will only see
          you for bookings that match these types.
        </p>
        <div
          id={id}
          className="grid grid-cols-2 gap-2 sm:grid-cols-3"
          role="group"
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? errorId : undefined}
        >
          {OPERATOR_FLEET_VEHICLE_TYPES.map((type) => {
            const checked = value.includes(type);
            return (
              <label
                key={type}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${
                  checked
                    ? "border-secondary bg-sky-50 text-content shadow-sm"
                    : "border-slate-200 bg-slate-50 text-content/80 hover:border-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-secondary focus:ring-secondary"
                  checked={checked}
                  onChange={() => toggle(type)}
                />
                <span className="font-medium">{type}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      {error ? (
        <p id={errorId} className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
