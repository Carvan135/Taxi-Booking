import { z } from "zod";
import { signUpSchema } from "@/lib/validations/auth";

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: signUpSchema.shape.password,
    confirm_password: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  })
  .refine((data) => data.current_password !== data.new_password, {
    message: "New password must be different from your current password",
    path: ["new_password"],
  });

export type ChangePasswordFormInput = z.input<typeof changePasswordSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
