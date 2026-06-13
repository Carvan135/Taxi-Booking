export { wrapEmailTemplate } from "@/lib/email/templates/base";
export { bookingConfirmationEmail } from "@/lib/email/templates/bookingConfirmation";
export { bookingReceiptEmail } from "@/lib/email/templates/bookingReceipt";
export { passwordResetEmail } from "@/lib/email/templates/passwordReset";
export { operatorNewBookingEmail } from "@/lib/email/templates/operatorNewBooking";
export { completionRequestEmail } from "@/lib/email/templates/completionRequest";
export { refundConfirmationEmail } from "@/lib/email/templates/refundConfirmation";
export { cancellationConfirmationEmail } from "@/lib/email/templates/cancellationConfirmation";
export { tripUpdateEmail } from "@/lib/email/templates/tripUpdate";
export {
  buildBookingConfirmationEmail,
  buildPasswordResetEmail,
  buildReceiptHtml,
  buildTripUpdateEmail,
  bookingLookupUrl,
} from "@/lib/email/templates/compat";
