import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import {
  bookingToReceiptEmailData,
  type ReceiptBooking,
} from "@/lib/pdf/booking-to-receipt-data";
import type { BookingEmailData, BookingEmailReturnLeg } from "@/lib/email/types";
import { formatBookingVehicleType } from "@/lib/operator/fleet-vehicle-types";

const NAVY = rgb(0.118, 0.227, 0.373);
const MUTED = rgb(0.42, 0.45, 0.5);
const TEXT = rgb(0.067, 0.094, 0.153);
const BORDER = rgb(0.898, 0.906, 0.918);
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;

type ReceiptData = BookingEmailData & BookingEmailReturnLeg;

function formatMoney(amount: number): string {
  return `£${amount.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatIssuedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = words[0]!;

  for (let i = 1; i < words.length; i += 1) {
    const next = `${current} ${words[i]}`;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      lines.push(current);
      current = words[i]!;
    }
  }
  lines.push(current);
  return lines;
}

function drawLines(
  page: PDFPage,
  lines: string[],
  x: number,
  y: number,
  size: number,
  font: PDFFont,
  color = TEXT,
  lineHeight = size + 4,
): number {
  let cursorY = y;
  for (const line of lines) {
    page.drawText(line, { x, y: cursorY, size, font, color });
    cursorY -= lineHeight;
  }
  return cursorY;
}

export async function generateReceiptPdfBytes(
  booking: ReceiptBooking,
  issuedAt = new Date().toISOString(),
): Promise<Uint8Array> {
  const data = bookingToReceiptEmailData(booking);
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = PAGE_HEIGHT - MARGIN;

  page.drawRectangle({
    x: 0,
    y: y - 56,
    width: PAGE_WIDTH,
    height: 80,
    color: NAVY,
  });
  page.drawText("AirportHub", {
    x: MARGIN,
    y: y - 8,
    size: 22,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText("Payment Receipt", {
    x: MARGIN,
    y: y - 30,
    size: 13,
    font,
    color: rgb(0.886, 0.91, 0.941),
  });
  y -= 88;

  page.drawText("RECEIPT NUMBER", {
    x: MARGIN,
    y,
    size: 8,
    font: bold,
    color: MUTED,
  });
  page.drawText(`REC-${data.reference}`, {
    x: MARGIN,
    y: y - 12,
    size: 11,
    font: bold,
    color: NAVY,
  });

  const issuedLabelX = PAGE_WIDTH - MARGIN - 140;
  page.drawText("DATE ISSUED", {
    x: issuedLabelX,
    y,
    size: 8,
    font: bold,
    color: MUTED,
  });
  page.drawText(formatIssuedDate(issuedAt), {
    x: issuedLabelX,
    y: y - 12,
    size: 11,
    font: bold,
    color: NAVY,
  });
  y -= 36;

  const columnWidth = (PAGE_WIDTH - MARGIN * 2 - 24) / 2;
  const leftX = MARGIN;
  const rightX = MARGIN + columnWidth + 24;

  page.drawText("BILLED TO", {
    x: leftX,
    y,
    size: 9,
    font: bold,
    color: MUTED,
  });
  y = drawLines(
    page,
    [data.customer_name, data.customer_email],
    leftX,
    y - 14,
    10,
    font,
  ) - 8;

  const bookingTop = PAGE_HEIGHT - MARGIN - 88 - 36;
  page.drawText("BOOKING", {
    x: rightX,
    y: bookingTop,
    size: 9,
    font: bold,
    color: MUTED,
  });
  const pickupWhen = `${data.pickup_date} at ${data.pickup_time}`;
  let rightY = drawLines(
    page,
    [
      `Ref: ${data.reference}`,
      `Pickup: ${pickupWhen}`,
      `Operator: ${data.operator_name}`,
      `Vehicle: ${data.vehicle_type}`,
    ],
    rightX,
    bookingTop - 14,
    10,
    font,
  );

  y = Math.min(y, rightY) - 16;

  page.drawText("JOURNEY DETAILS", {
    x: MARGIN,
    y,
    size: 9,
    font: bold,
    color: MUTED,
  });
  y -= 18;

  const tableX = MARGIN;
  const tableWidth = PAGE_WIDTH - MARGIN * 2;
  const labelColWidth = tableWidth * 0.28;
  const rows: Array<[string, string]> = [
    ["Pickup", data.pickup_address],
    ["Dropoff", data.dropoff_address],
    ["Date & time", pickupWhen],
    ["Passengers", String(data.passengers)],
    ["Service", formatBookingVehicleType(data.service_type)],
  ];

  if (data.booking_type === "return" && data.return_date && data.return_time) {
    rows.push(
      ["Return pickup", data.return_pickup_address ?? data.dropoff_address],
      ["Return dropoff", data.return_dropoff_address ?? data.pickup_address],
      ["Return time", `${data.return_date} at ${data.return_time}`],
    );
  }

  const rowHeight = 22;
  page.drawRectangle({
    x: tableX,
    y: y - rowHeight,
    width: tableWidth,
    height: rowHeight,
    color: rgb(0.976, 0.98, 0.984),
    borderColor: BORDER,
    borderWidth: 1,
  });
  page.drawText("Detail", {
    x: tableX + 10,
    y: y - 15,
    size: 9,
    font: bold,
    color: MUTED,
  });
  page.drawText("Outbound", {
    x: tableX + labelColWidth + 10,
    y: y - 15,
    size: 9,
    font: bold,
    color: MUTED,
  });
  y -= rowHeight;

  for (const [label, value] of rows) {
    page.drawRectangle({
      x: tableX,
      y: y - rowHeight,
      width: tableWidth,
      height: rowHeight,
      borderColor: BORDER,
      borderWidth: 1,
    });
    page.drawText(label, {
      x: tableX + 10,
      y: y - 15,
      size: 9,
      font,
      color: MUTED,
    });
    const valueLines = wrapText(
      value,
      font,
      10,
      tableWidth - labelColWidth - 20,
    );
    page.drawText(valueLines[0] ?? value, {
      x: tableX + labelColWidth + 10,
      y: y - 15,
      size: 10,
      font,
      color: TEXT,
    });
    y -= rowHeight;
  }

  y -= 20;

  const journeyFare = Math.max(0, data.price - data.platform_commission);
  const feePercent =
    data.price > 0
      ? Math.round((data.platform_commission / data.price) * 100)
      : 0;
  const boxWidth = 260;
  const boxX = PAGE_WIDTH - MARGIN - boxWidth;

  page.drawRectangle({
    x: boxX,
    y: y - 88,
    width: boxWidth,
    height: 88,
    borderColor: BORDER,
    borderWidth: 1,
  });

  const drawBreakdownRow = (
    rowY: number,
    label: string,
    value: string,
    valueFont = font,
  ) => {
    page.drawText(label, {
      x: boxX + 12,
      y: rowY,
      size: 10,
      font,
      color: MUTED,
    });
    const valueWidth = valueFont.widthOfTextAtSize(value, 10);
    page.drawText(value, {
      x: boxX + boxWidth - 12 - valueWidth,
      y: rowY,
      size: 10,
      font: valueFont,
      color: TEXT,
    });
  };

  drawBreakdownRow(y - 18, "Journey fare", formatMoney(journeyFare));
  drawBreakdownRow(
    y - 36,
    `Platform fee (${feePercent}%)`,
    formatMoney(data.platform_commission),
  );
  page.drawLine({
    start: { x: boxX + 12, y: y - 50 },
    end: { x: boxX + boxWidth - 12, y: y - 50 },
    thickness: 1,
    color: BORDER,
  });
  drawBreakdownRow(y - 68, "Total paid", formatMoney(data.price), bold);

  const footer = "support@airporthub.co.uk · airporthub.co.uk";
  const footerWidth = font.widthOfTextAtSize(footer, 9);
  page.drawText(footer, {
    x: (PAGE_WIDTH - footerWidth) / 2,
    y: 40,
    size: 9,
    font,
    color: MUTED,
  });

  return pdfDoc.save();
}

export async function generateReceiptBuffer(
  booking: ReceiptBooking,
): Promise<Buffer> {
  const bytes = await generateReceiptPdfBytes(booking);
  return Buffer.from(bytes);
}
