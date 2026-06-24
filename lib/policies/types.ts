export const POLICY_TYPES = [
  "privacy_policy",
  "terms_conditions",
  "faq",
  "cookie_policy",
] as const;

export type PolicyType = (typeof POLICY_TYPES)[number];

export const POLICY_TYPE_LABELS: Record<PolicyType, string> = {
  privacy_policy: "Privacy Policy",
  terms_conditions: "Terms & Conditions",
  faq: "FAQ",
  cookie_policy: "Cookie Policy",
};

export const POLICY_STORAGE_BUCKET = "policy-documents";
