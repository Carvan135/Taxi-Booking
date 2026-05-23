/**
 * Pickup date/time on the booking form are UK local (Europe/London) — when and where the journey happens.
 */

export const UK_BOOKING_TIMEZONE = "Europe/London";

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export type UkPickupWallClock = {
  /** 0 = Sunday … 6 = Saturday (UK local) */
  dayOfWeek: number;
  minutesOfDay: number;
  weekdayLabel: string;
  isoDate: string;
  time: string;
};

function parseIsoDate(isoDate: string): { y: number; m: number; d: number } | null {
  // DATE columns may arrive as "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss..."
  const datePart = isoDate.trim().slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!match) return null;
  return {
    y: Number(match[1]),
    m: Number(match[2]),
    d: Number(match[3]),
  };
}

/** Parses HH:MM or HH:MM:SS (Postgres `time` columns include seconds). */
export function parseTimeToMinutes(time: string): number | null {
  const trimmed = time.trim();
  const match = /^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(trimmed);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Normalize booking pickup fields from DB/API for schedule comparisons. */
export function normalizeBookingPickupFields(booking: {
  pickup_date: string;
  pickup_time: string;
}): { pickup_date: string; pickup_time: string } {
  return {
    pickup_date: booking.pickup_date.trim().slice(0, 10),
    pickup_time: booking.pickup_time.trim(),
  };
}

/** Offset (ms) of `timeZone` vs UTC at the given instant. */
function getTimeZoneOffsetMs(timeZone: string, date: Date): number {
  const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const zoned = new Date(date.toLocaleString("en-US", { timeZone }));
  return zoned.getTime() - utc.getTime();
}

/** Wall clock in `timeZone` → UTC instant. */
function zonedWallClockToUtc(
  y: number,
  m: number,
  d: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const utcGuess = Date.UTC(y, m - 1, d, hour, minute, 0);
  const offset = getTimeZoneOffsetMs(timeZone, new Date(utcGuess));
  return new Date(utcGuess - offset);
}

function readLondonWallClock(instant: Date): {
  y: number;
  m: number;
  d: number;
  hour: number;
  minute: number;
  weekday: string;
} {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: UK_BOOKING_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(instant).map((p) => [p.type, p.value]),
  );
  return {
    y: Number(parts.year),
    m: Number(parts.month),
    d: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday: parts.weekday ?? "Mon",
  };
}

/**
 * Interpret `pickup_date` + `pickup_time` as UK local wall clock (not the user's device timezone).
 */
export function parseUkPickupDateTime(
  pickup_date: string,
  pickup_time: string,
): UkPickupWallClock | null {
  const dateParts = parseIsoDate(pickup_date);
  const minutesOfDay = parseTimeToMinutes(pickup_time);
  if (!dateParts || minutesOfDay == null) return null;

  const hour = Math.floor(minutesOfDay / 60);
  const minute = minutesOfDay % 60;

  const instant = zonedWallClockToUtc(
    dateParts.y,
    dateParts.m,
    dateParts.d,
    hour,
    minute,
    UK_BOOKING_TIMEZONE,
  );

  const london = readLondonWallClock(instant);
  const dayOfWeek = WEEKDAY_INDEX[london.weekday];
  if (dayOfWeek === undefined) return null;

  return {
    dayOfWeek,
    minutesOfDay,
    weekdayLabel: london.weekday,
    isoDate: pickup_date,
    time: pickup_time,
  };
}

export function isWeekendPickupUK(
  pickup_date: string,
  pickup_time: string,
): boolean {
  const parsed = parseUkPickupDateTime(pickup_date, pickup_time);
  if (!parsed) return false;
  return parsed.dayOfWeek === 0 || parsed.dayOfWeek === 6;
}

/** UK-local pickup instant as UTC `Date`, or null if inputs are invalid. */
export function getUkPickupDateTimeInstant(
  pickup_date: string,
  pickup_time: string,
): Date | null {
  const dateParts = parseIsoDate(pickup_date);
  const minutesOfDay = parseTimeToMinutes(pickup_time);
  if (!dateParts || minutesOfDay == null) return null;

  const hour = Math.floor(minutesOfDay / 60);
  const minute = minutesOfDay % 60;

  return zonedWallClockToUtc(
    dateParts.y,
    dateParts.m,
    dateParts.d,
    hour,
    minute,
    UK_BOOKING_TIMEZONE,
  );
}

/** Inclusive UK calendar-day range as UTC ISO bounds (for timestamptz filters). */
export function ukCalendarDayRangeToUtcIso(
  fromYmd: string,
  toYmd: string,
): { startIso: string; endIso: string } | null {
  const start = getUkPickupDateTimeInstant(fromYmd, "00:00");
  const end = getUkPickupDateTimeInstant(toYmd, "23:59:59");
  if (!start || !end) return null;
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

/** True when scheduled UK pickup is still in the future. */
export function isPickupStillInFuture(
  pickup_date: string,
  pickup_time: string,
  now: Date = new Date(),
): boolean {
  const instant = getUkPickupDateTimeInstant(pickup_date, pickup_time);
  if (!instant) return false;
  return instant.getTime() > now.getTime();
}

/** Human-readable time until UK pickup (e.g. "2h 15m"). */
export function formatTimeUntilUkPickup(
  pickup_date: string,
  pickup_time: string,
  now: Date = new Date(),
): string {
  const instant = getUkPickupDateTimeInstant(pickup_date, pickup_time);
  if (!instant) return "";

  const diffMs = instant.getTime() - now.getTime();
  if (diffMs <= 0) return "";

  const totalMins = Math.ceil(diffMs / (60 * 1000));
  const days = Math.floor(totalMins / (60 * 24));
  const hours = Math.floor((totalMins % (60 * 24)) / 60);
  const mins = totalMins % 60;

  if (days > 0) {
    return days === 1
      ? `1 day${hours > 0 ? ` ${hours}h` : ""}`
      : `${days} days${hours > 0 ? ` ${hours}h` : ""}`;
  }
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${mins}m`;
}

export function isOutOfHoursPickupUK(
  pickup_time: string,
  timeStart: string | null,
  timeEnd: string | null,
): boolean {
  const minutes = parseTimeToMinutes(pickup_time);
  const start = parseTimeToMinutes(timeStart ?? "22:00");
  const end = parseTimeToMinutes(timeEnd ?? "06:00");
  if (minutes == null || start == null || end == null) return false;

  if (start > end) {
    return minutes >= start || minutes < end;
  }
  return minutes >= start && minutes < end;
}
