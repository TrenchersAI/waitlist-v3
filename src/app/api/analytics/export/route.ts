import { getAnalyticsSessionFromCookies } from "@/src/lib/analytics-internal";
import {
  fetchSignupsForExport,
  parseAnalyticsRange,
  type SignupStatusFilter,
} from "@/src/lib/analytics-stats";

export const runtime = "nodejs";

const STATUS_VALUES: SignupStatusFilter[] = ["all", "verified", "pending"];
const EXPORT_CAP = 10_000;

function csvEscape(value: string | number | boolean | Date | null) {
  if (value === null || value === undefined) return "";
  let str: string;
  if (value instanceof Date) str = value.toISOString();
  else str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: Request) {
  const session = await getAnalyticsSessionFromCookies();
  if (!session) {
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const { fromStr, toStr, from, toInclusive } = parseAnalyticsRange(
    searchParams.get("from"),
    searchParams.get("to"),
  );

  const rawStatus = searchParams.get("status")?.trim().toLowerCase() ?? "all";
  const status = STATUS_VALUES.includes(rawStatus as SignupStatusFilter)
    ? (rawStatus as SignupStatusFilter)
    : "all";

  const rows = await fetchSignupsForExport({
    from,
    toInclusive,
    status,
    cap: EXPORT_CAP,
  });

  const header = [
    "email",
    "isVerified",
    "createdAtUtc",
    "verifiedAtUtc",
    "referralsMade",
    "referralCode",
    "referredById",
  ].join(",");

  const body = rows
    .map((row) =>
      [
        csvEscape(row.email),
        csvEscape(row.isVerified),
        csvEscape(row.createdAt),
        csvEscape(row.verifiedAt),
        csvEscape(row.referralsMade),
        csvEscape(row.referralCode),
        csvEscape(row.referredById),
      ].join(","),
    )
    .join("\n");

  const csv = `${header}\n${body}${body ? "\n" : ""}`;
  const filename = `trenchers-signups_${fromStr}_to_${toStr}_${status}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
