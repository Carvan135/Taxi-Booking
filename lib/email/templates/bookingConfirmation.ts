import type { BookingEmailData, BookingEmailReturnLeg } from "@/lib/email/types";
import {
  ctaButton,
  detailTable,
  emailHeading,
  emailParagraph,
  escapeHtml,
  formatDateDisplay,
  formatMoney,
  formatServiceType,
  priceHighlight,
  referenceBadge,
  sectionLabel,
  stepsList,
  wrapEmailTemplate,
} from "@/lib/email/templates/base";

export function bookingConfirmationEmail(
  data: BookingEmailData & BookingEmailReturnLeg,
): { subject: string; html: string } {
  const name = data.customer_name.trim() || "there";
  const lookupUrl = `${data.app_url.replace(/\/$/, "")}/bookings/lookup?${new URLSearchParams({
    ref: data.reference,
    email: data.customer_email,
  }).toString()}`;

  const journeyRows = [
    { label: "Pickup", value: escapeHtml(data.pickup_address) },
    { label: "Dropoff", value: escapeHtml(data.dropoff_address) },
    {
      label: "Date & time",
      value: escapeHtml(formatDateDisplay(data.pickup_date, data.pickup_time)),
    },
    { label: "Passengers", value: String(data.passengers) },
    {
      label: "Vehicle type",
      value: escapeHtml(formatServiceType(data.service_type)),
    },
  ];

  let returnSection = "";
  if (
    data.booking_type === "return" &&
    data.return_date &&
    data.return_time
  ) {
    const returnRows = [
      {
        label: "Return pickup",
        value: escapeHtml(data.return_pickup_address ?? data.dropoff_address),
      },
      {
        label: "Return dropoff",
        value: escapeHtml(data.return_dropoff_address ?? data.pickup_address),
      },
      {
        label: "Return date & time",
        value: escapeHtml(formatDateDisplay(data.return_date, data.return_time)),
      },
    ];
    returnSection = `
      ${sectionLabel("Return journey")}
      ${detailTable(returnRows)}
    `;
  }

  const content = `
    ${emailHeading("Booking Confirmed ✓")}
    ${emailParagraph(`Hi ${escapeHtml(name)}, your payment was successful and your journey is confirmed.`)}
    ${referenceBadge(data.reference)}
    ${sectionLabel("Your journey")}
    ${detailTable(journeyRows)}
    ${returnSection}
    ${sectionLabel("Your operator")}
    ${detailTable([
      { label: "Operator", value: escapeHtml(data.operator_name) },
      { label: "Vehicle", value: escapeHtml(data.vehicle_type) },
    ])}
    ${priceHighlight("Price paid", data.price)}
    ${sectionLabel("What happens next")}
    ${stepsList([
      "Check your inbox — this email is your confirmation",
      "Your operator may contact you before pickup",
      "View or manage your booking anytime without signing in",
    ])}
    ${ctaButton(lookupUrl, "View Your Booking")}
  `;

  return {
    subject: `Booking confirmed — ${data.reference}`,
    html: wrapEmailTemplate(
      content,
      `Your AirportHub booking ${data.reference} is confirmed. Total paid ${formatMoney(data.price)}.`,
    ),
  };
}
