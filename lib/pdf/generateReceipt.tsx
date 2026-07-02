import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  bookingToReceiptEmailData,
  type ReceiptBooking,
} from "@/lib/pdf/booking-to-receipt-data";
import { ReceiptPDF } from "@/lib/pdf/receipt";
export async function generateReceiptBuffer(
  booking: ReceiptBooking,
): Promise<Buffer> {
  const data = bookingToReceiptEmailData(booking);
  const pdf = await renderToBuffer(
    <ReceiptPDF data={data} issuedAt={new Date().toISOString()} />,
  );
  return Buffer.from(pdf);
}
