"use client";

import { Suspense } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  LoginForm,
  LoginFormCardFallback,
} from "@/components/auth/LoginForm";
import type { UserRole } from "@/types";

type CustomerSignInModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: (result: { role: UserRole }) => void | Promise<void>;
};

export function CustomerSignInModal({
  open,
  onClose,
  onSuccess,
}: CustomerSignInModalProps) {
  return (
    <Modal open={open} title="Sign in" onClose={onClose}>
      <Suspense fallback={<LoginFormCardFallback />}>
        <LoginForm
          variant="rider"
          allowedRoles={["customer"]}
          embedded
          redirectTo={null}
          signupRedirectTo="/payment"
          onSuccess={async (result) => {
            await onSuccess?.(result);
            onClose();
          }}
        />
      </Suspense>
    </Modal>
  );
}
