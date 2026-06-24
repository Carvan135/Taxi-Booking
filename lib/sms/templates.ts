function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3)}...`;
}

export function pickupReminderSMS(data: {
  customerName: string;
  pickupTime: string;
  pickupAddress: string;
  operatorName: string;
  reference: string;
}): string {
  const firstName = data.customerName.trim().split(/\s+/)[0] || "there";
  const time = data.pickupTime.trim().slice(0, 5);
  const address = truncate(data.pickupAddress.trim(), 42);
  const operator = truncate(data.operatorName.trim(), 24);
  const reference = data.reference.trim();

  return `Hi ${firstName}, reminder: your AirportHub ride (ref ${reference}) is picking you up at ${time} from ${address}. Driver: ${operator}. Reply HELP for support.`;
}
