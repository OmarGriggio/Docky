import { AppError } from "../../shared/types/errors";

// The date or period of the service an invoice bills (art. 26 al. 2 let. d
// LTVA): a single date, or from one day to another. Pure - see
// service-period.test.ts.

export interface ServicePeriod {
  service_date_start: string | null;
  service_date_end: string | null;
}

const NO_PERIOD: ServicePeriod = { service_date_start: null, service_date_end: null };

// "2026-10-05" and a real day (no 31st of February).
const dateOnlyOf = (value: unknown): string | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const match = typeof value === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  if (match) {
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) {
      return value as string;
    }
  }
  throw new AppError("A service date must be a YYYY-MM-DD date", 400, "SERVICE_DATE_INVALID");
};

/**
 * What a request's service dates become: none for anything but an invoice;
 * an end alone is that single date; an end on the start day is no end; an
 * end before the start is a 400.
 */
export const normalizeServicePeriod = (type: string, start: unknown, end: unknown): ServicePeriod => {
  if (type !== "INVOICE") {
    return NO_PERIOD;
  }
  let from = dateOnlyOf(start);
  let to = dateOnlyOf(end);
  if (!from && to) {
    [from, to] = [to, null];
  }
  if (from && to && to < from) {
    throw new AppError("The service period can't end before it starts", 400, "SERVICE_PERIOD_INVALID");
  }
  return { service_date_start: from, service_date_end: to === from ? null : to };
};
