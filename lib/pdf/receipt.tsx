import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type {
  BookingEmailData,
  BookingEmailReturnLeg,
} from "@/lib/email/types";
import { formatBookingVehicleType } from "@/lib/operator/fleet-vehicle-types";

const NAVY = "#1E3A5F";
const MUTED = "#6B7280";
const BORDER = "#E5E7EB";

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  header: {
    backgroundColor: NAVY,
    marginHorizontal: -48,
    marginTop: -48,
    paddingHorizontal: 48,
    paddingVertical: 28,
    marginBottom: 28,
  },
  brand: {
    fontSize: 22,
    fontWeight: 700,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#E2E8F0",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  metaBlock: {},
  metaLabel: {
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: MUTED,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 11,
    fontWeight: 700,
    color: NAVY,
  },
  columns: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 24,
  },
  column: {
    flex: 1,
  },
  columnTitle: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: MUTED,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  columnLine: {
    fontSize: 10,
    marginBottom: 4,
    lineHeight: 1.4,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: MUTED,
    marginBottom: 8,
  },
  table: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableRowLast: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  colLabel: {
    width: "28%",
    fontSize: 9,
    color: MUTED,
  },
  colValue: {
    width: "72%",
    fontSize: 10,
  },
  breakdown: {
    marginLeft: "auto",
    width: 260,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 12,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  breakdownLabel: {
    fontSize: 10,
    color: MUTED,
  },
  breakdownValue: {
    fontSize: 10,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: NAVY,
  },
  totalValue: {
    fontSize: 13,
    fontWeight: 700,
    color: NAVY,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 12,
    fontSize: 9,
    color: MUTED,
    textAlign: "center",
  },
});

function formatMoney(amount: number): string {
  return `£${amount.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatServiceType(serviceType: string): string {
  return formatBookingVehicleType(serviceType);
}

function formatIssuedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function JourneyTableRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  const rowStyle = last ? styles.tableRowLast : styles.tableRow;
  return (
    <View style={rowStyle}>
      <Text style={styles.colLabel}>{label}</Text>
      <Text style={styles.colValue}>{value}</Text>
    </View>
  );
}

export type ReceiptPDFProps = {
  data: BookingEmailData & BookingEmailReturnLeg;
  issuedAt?: string;
};

export function ReceiptPDF({ data, issuedAt }: ReceiptPDFProps) {
  const issued = issuedAt ?? new Date().toISOString();
  const journeyFare = Math.max(0, data.price - data.platform_commission);
  const feePercent =
    data.price > 0
      ? Math.round((data.platform_commission / data.price) * 100)
      : 0;
  const pickupWhen = `${data.pickup_date} at ${data.pickup_time}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>AirportHub</Text>
          <Text style={styles.headerSubtitle}>Payment Receipt</Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Receipt number</Text>
            <Text style={styles.metaValue}>REC-{data.reference}</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Date issued</Text>
            <Text style={styles.metaValue}>{formatIssuedDate(issued)}</Text>
          </View>
        </View>

        <View style={styles.columns}>
          <View style={styles.column}>
            <Text style={styles.columnTitle}>Billed to</Text>
            <Text style={styles.columnLine}>{data.customer_name}</Text>
            <Text style={styles.columnLine}>{data.customer_email}</Text>
          </View>
          <View style={styles.column}>
            <Text style={styles.columnTitle}>Booking</Text>
            <Text style={styles.columnLine}>Ref: {data.reference}</Text>
            <Text style={styles.columnLine}>Pickup: {pickupWhen}</Text>
            <Text style={styles.columnLine}>
              Operator: {data.operator_name}
            </Text>
            <Text style={styles.columnLine}>Vehicle: {data.vehicle_type}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Journey details</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colLabel}>Detail</Text>
            <Text style={styles.colValue}>Outbound</Text>
          </View>
          <JourneyTableRow label="Pickup" value={data.pickup_address} />
          <JourneyTableRow label="Dropoff" value={data.dropoff_address} />
          <JourneyTableRow label="Date & time" value={pickupWhen} />
          <JourneyTableRow
            label="Passengers"
            value={String(data.passengers)}
          />
          <JourneyTableRow
            label="Service"
            value={formatServiceType(data.service_type)}
            last={
              data.booking_type !== "return" || !data.return_date
            }
          />
          {data.booking_type === "return" &&
          data.return_date &&
          data.return_time ? (
            <>
              <JourneyTableRow
                label="Return pickup"
                value={
                  data.return_pickup_address ?? data.dropoff_address
                }
              />
              <JourneyTableRow
                label="Return dropoff"
                value={
                  data.return_dropoff_address ?? data.pickup_address
                }
              />
              <JourneyTableRow
                label="Return time"
                value={`${data.return_date} at ${data.return_time}`}
                last
              />
            </>
          ) : null}
        </View>

        <View style={styles.breakdown}>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Journey fare</Text>
            <Text style={styles.breakdownValue}>
              {formatMoney(journeyFare)}
            </Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>
              Platform fee ({feePercent}%)
            </Text>
            <Text style={styles.breakdownValue}>
              {formatMoney(data.platform_commission)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total paid</Text>
            <Text style={styles.totalValue}>{formatMoney(data.price)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>support@airporthub.co.uk · airporthub.co.uk</Text>
      </Page>
    </Document>
  );
}
