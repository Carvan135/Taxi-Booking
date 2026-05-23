import { RULE_TYPE, type RuleType } from "@/lib/validations/enums";

export const PRICE_RULE_KEYS = [
  "airport_pickup",
  "airport_dropoff",
  "out_of_hours",
  "weekend",
] as const;

export type PriceRuleKey = (typeof PRICE_RULE_KEYS)[number];

export type PriceRuleTemplate = {
  rule_key: PriceRuleKey;
  name: string;
  description: string;
  rule_type: RuleType;
  default_value: number;
  default_active: boolean;
  time_start: string | null;
  time_end: string | null;
};

export const PRICE_RULE_TEMPLATES: readonly PriceRuleTemplate[] = [
  {
    rule_key: "airport_pickup",
    name: "Airport pickup",
    description: "Fixed surcharge when pickup is at an airport.",
    rule_type: RULE_TYPE.fixed_fee,
    default_value: 10,
    default_active: false,
    time_start: null,
    time_end: null,
  },
  {
    rule_key: "airport_dropoff",
    name: "Airport dropoff",
    description: "Fixed surcharge when dropoff is at an airport.",
    rule_type: RULE_TYPE.fixed_fee,
    default_value: 10,
    default_active: false,
    time_start: null,
    time_end: null,
  },
  {
    rule_key: "out_of_hours",
    name: "Out of hours",
    description:
      "Multiplier for pickups between 10pm and 6am UK time (Europe/London).",
    rule_type: RULE_TYPE.multiplier,
    default_value: 1.25,
    default_active: false,
    time_start: "22:00",
    time_end: "06:00",
  },
  {
    rule_key: "weekend",
    name: "Weekend",
    description:
      "Multiplier for Saturday and Sunday pickups (UK date and time, Europe/London).",
    rule_type: RULE_TYPE.multiplier,
    default_value: 1.15,
    default_active: false,
    time_start: null,
    time_end: null,
  },
] as const;

export function getPriceRuleTemplate(
  ruleKey: string,
): PriceRuleTemplate | undefined {
  return PRICE_RULE_TEMPLATES.find((t) => t.rule_key === ruleKey);
}

export function isPriceRuleKey(value: string): value is PriceRuleKey {
  return (PRICE_RULE_KEYS as readonly string[]).includes(value);
}
