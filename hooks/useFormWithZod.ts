"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type Resolver,
  type UseFormProps,
} from "react-hook-form";
import type { z } from "zod";

type FormShape<TSchema extends z.ZodTypeAny> = z.infer<TSchema> & FieldValues;

export type UseFormWithZodOptions<TSchema extends z.ZodTypeAny> = Omit<
  UseFormProps<FormShape<TSchema>>,
  "resolver"
> & {
  defaultValues?: DefaultValues<FormShape<TSchema>>;
};

export function useFormWithZod<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  options?: UseFormWithZodOptions<TSchema>,
) {
  return useForm<FormShape<TSchema>>({
    ...options,
    // @hookform/resolvers typings assume Zod 3; Zod 4 works at runtime.
    resolver: zodResolver(schema as Parameters<typeof zodResolver>[0]) as unknown as Resolver<
      FormShape<TSchema>
    >,
  });
}
