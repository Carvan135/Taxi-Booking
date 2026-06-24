export const bookingKeys = {
  customer: ["bookings", "customer"] as const,
  operator: ["bookings", "operator"] as const,
  detail: (id: string) => ["booking", id] as const,
  guest: (id: string, email: string) =>
    ["booking", "guest", id, email.toLowerCase()] as const,
};

export const priceRuleKeys = {
  list: (operatorId: string) => ["price_rules", operatorId] as const,
};

export const basePricingKeys = {
  detail: (operatorId: string) => ["base_pricing", operatorId] as const,
};

export const platformSettingsKeys = {
  all: ["platform_settings"] as const,
};

export const policyDocumentKeys = {
  all: ["policy_documents"] as const,
};

export const adminBookingKeys = {
  all: ["admin", "bookings"] as const,
};

export const operatorKeys = {
  approved: (serviceType?: string) =>
    serviceType
      ? (["operators", "approved", serviceType] as const)
      : (["operators", "approved"] as const),
};

export const notificationKeys = {
  all: ["notifications"] as const,
  unreadCount: ["notifications", "unread_count"] as const,
};
