"use client";

import { Eye, EyeOff } from "lucide-react";
import type { FieldError } from "react-hook-form";
import type { UseFormRegisterReturn } from "react-hook-form";
import type { InputHTMLAttributes } from "react";
import { useState } from "react";

export type FormFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "name" | "id"
> & {
  label: string;
  name: string;
  register: UseFormRegisterReturn;
  error?: FieldError;
  /** When set with `type="password"`, adds an eye toggle to show or hide the value */
  passwordToggle?: boolean;
};

export function FormField({
  label,
  name,
  register,
  error,
  type = "text",
  placeholder,
  className = "",
  passwordToggle = false,
  ...rest
}: FormFieldProps) {
  const [visible, setVisible] = useState(false);
  const useToggle = passwordToggle && type === "password";
  const inputType = useToggle ? (visible ? "text" : "password") : type;

  const inputClassName = `w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-content shadow-sm transition placeholder:text-slate-400 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${useToggle ? "pr-11" : ""} ${className}`;

  const inputEl = (
    <input
      id={name}
      type={inputType}
      placeholder={placeholder}
      aria-invalid={error ? "true" : "false"}
      aria-describedby={error ? `${name}-error` : undefined}
      className={inputClassName}
      {...register}
      {...rest}
    />
  );

  return (
    <div className="w-full">
      <label
        htmlFor={name}
        className="mb-1.5 block text-sm font-medium text-content"
      >
        {label}
      </label>
      {useToggle ? (
        <div className="relative">
          {inputEl}
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-content/60 transition hover:bg-slate-100 hover:text-content"
            aria-label={visible ? "Hide password" : "Show password"}
            aria-controls={name}
          >
            {visible ? (
              <EyeOff className="h-4 w-4" aria-hidden />
            ) : (
              <Eye className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>
      ) : (
        inputEl
      )}
      {error?.message ? (
        <p id={`${name}-error`} className="mt-1.5 text-sm text-red-600" role="alert">
          {error.message}
        </p>
      ) : null}
    </div>
  );
}
