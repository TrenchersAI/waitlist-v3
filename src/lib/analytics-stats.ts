import { Prisma } from "@/src/generated/prisma/client";

import { getPrismaClient } from "@/src/lib/prisma";

export type SignupStatusFilter = "all" | "verified" | "pending";

function utcDayStart(isoDate: string) {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function utcDayEndInclusive(isoDate: string) {
  const d = new Date(`${isoDate}T23:59:59.999Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function defaultAnalyticsRange() {
  const now = new Date();
  const toStr = now.toISOString().slice(0, 10);
  const fromAnchor = new Date(now);
  fromAnchor.setUTCDate(fromAnchor.getUTCDate() - 29);
  const fromStr = fromAnchor.toISOString().slice(0, 10);
  return {
    fromStr,
    toStr,
    from: utcDayStart(fromStr)!,
    toInclusive: utcDayEndInclusive(toStr)!,
  };
}

export function parseAnalyticsRange(fromParam: string | null, toParam: string | null) {
  const fallback = defaultAnalyticsRange();
  const fromStr = fromParam?.trim() || fallback.fromStr;
  const toStr = toParam?.trim() || fallback.toStr;
  const from = utcDayStart(fromStr) ?? fallback.from;
  const toEnd = utcDayEndInclusive(toStr) ?? fallback.toInclusive;
  if (from.getTime() > toEnd.getTime()) {
    return {
      fromStr: fallback.fromStr,
      toStr: fallback.toStr,
      from: fallback.from,
      toInclusive: fallback.toInclusive,
    };
  }
  return { fromStr, toStr, from, toInclusive: toEnd };
}

function eachUtcDay(from: Date, toInclusive: Date): string[] {
  const keys: string[] = [];
  const cursor = new Date(
    Date.UTC(
      from.getUTCFullYear(),
      from.getUTCMonth(),
      from.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
  const end = new Date(
    Date.UTC(
      toInclusive.getUTCFullYear(),
      toInclusive.getUTCMonth(),
      toInclusive.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
  while (cursor.getTime() <= end.getTime()) {
    keys.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}

function mapCountsToSeries(
  days: string[],
  rows: { day: Date; count: bigint }[],
) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = row.day.toISOString().slice(0, 10);
    map.set(key, Number(row.count));
  }
  return days.map((date) => ({ date, count: map.get(date) ?? 0 }));
}

export async function fetchDailyCreatedCounts(from: Date, toInclusive: Date) {
  const prisma = getPrismaClient();
  const rows = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
    SELECT date_trunc('day', s."createdAt" AT TIME ZONE 'UTC') AS day,
           COUNT(*)::bigint AS count
    FROM "WaitlistSubscriber" s
    WHERE s."createdAt" >= ${from}
      AND s."createdAt" <= ${toInclusive}
    GROUP BY 1
    ORDER BY 1 ASC
  `;
  const days = eachUtcDay(from, toInclusive);
  return mapCountsToSeries(days, rows);
}

export async function fetchDailyVerifiedCounts(from: Date, toInclusive: Date) {
  const prisma = getPrismaClient();
  const rows = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
    SELECT date_trunc('day', s."verifiedAt" AT TIME ZONE 'UTC') AS day,
           COUNT(*)::bigint AS count
    FROM "WaitlistSubscriber" s
    WHERE s."isVerified" = true
      AND s."verifiedAt" IS NOT NULL
      AND s."verifiedAt" >= ${from}
      AND s."verifiedAt" <= ${toInclusive}
    GROUP BY 1
    ORDER BY 1 ASC
  `;
  const days = eachUtcDay(from, toInclusive);
  return mapCountsToSeries(days, rows);
}

export async function fetchTotalsInRange(from: Date, toInclusive: Date) {
  const prisma = getPrismaClient();
  const [createdAgg, verifiedInRange] = await Promise.all([
    prisma.waitlistSubscriber.count({
      where: {
        createdAt: { gte: from, lte: toInclusive },
      },
    }),
    prisma.waitlistSubscriber.count({
      where: {
        isVerified: true,
        verifiedAt: {
          not: null,
          gte: from,
          lte: toInclusive,
        },
      },
    }),
  ]);
  return { signupsStarted: createdAgg, signupsVerified: verifiedInRange };
}

export async function fetchAllTimeTotals() {
  const prisma = getPrismaClient();
  const [totalRows, verifiedRows] = await Promise.all([
    prisma.waitlistSubscriber.count(),
    prisma.waitlistSubscriber.count({ where: { isVerified: true } }),
  ]);
  return {
    totalSubscribers: totalRows,
    verifiedSubscribers: verifiedRows,
    pendingVerification: totalRows - verifiedRows,
  };
}

function signupsWhere(
  from: Date,
  toInclusive: Date,
  status: SignupStatusFilter,
): Prisma.WaitlistSubscriberWhereInput {
  const where: Prisma.WaitlistSubscriberWhereInput = {
    createdAt: { gte: from, lte: toInclusive },
  };
  if (status === "verified") where.isVerified = true;
  else if (status === "pending") where.isVerified = false;
  return where;
}

export async function fetchRecentSignups(params: {
  from: Date;
  toInclusive: Date;
  status: SignupStatusFilter;
  take: number;
  skip: number;
}) {
  const prisma = getPrismaClient();
  const where = signupsWhere(params.from, params.toInclusive, params.status);

  const [items, total] = await Promise.all([
    prisma.waitlistSubscriber.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: params.take,
      skip: params.skip,
      select: {
        id: true,
        email: true,
        isVerified: true,
        verifiedAt: true,
        createdAt: true,
        referralsMade: true,
        referralCode: true,
      },
    }),
    prisma.waitlistSubscriber.count({ where }),
  ]);

  return { items, total };
}

export async function fetchSignupsForExport(params: {
  from: Date;
  toInclusive: Date;
  status: SignupStatusFilter;
  cap: number;
}) {
  const prisma = getPrismaClient();
  const where = signupsWhere(params.from, params.toInclusive, params.status);
  return prisma.waitlistSubscriber.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: params.cap,
    select: {
      email: true,
      isVerified: true,
      verifiedAt: true,
      createdAt: true,
      referralsMade: true,
      referralCode: true,
      referredById: true,
    },
  });
}

export async function fetchReferralStats(from: Date, toInclusive: Date) {
  const prisma = getPrismaClient();

  const [
    referredCreatedInRange,
    referredVerifiedInRange,
    distinctReferrersInRange,
    allTimeReferredRows,
  ] = await Promise.all([
    prisma.waitlistSubscriber.count({
      where: {
        createdAt: { gte: from, lte: toInclusive },
        referredById: { not: null },
      },
    }),
    prisma.waitlistSubscriber.count({
      where: {
        createdAt: { gte: from, lte: toInclusive },
        referredById: { not: null },
        isVerified: true,
      },
    }),
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT "referredById")::bigint AS count
      FROM "WaitlistSubscriber"
      WHERE "referredById" IS NOT NULL
        AND "createdAt" >= ${from}
        AND "createdAt" <= ${toInclusive}
    `,
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "WaitlistSubscriber"
      WHERE "referredById" IS NOT NULL
    `,
  ]);

  const referrersInRange = Number(distinctReferrersInRange[0]?.count ?? 0);
  const allTimeReferred = Number(allTimeReferredRows[0]?.count ?? 0);

  return {
    referredCreatedInRange,
    referredVerifiedInRange,
    referrersInRange,
    avgReferralsPerReferrerInRange:
      referrersInRange > 0
        ? referredCreatedInRange / referrersInRange
        : 0,
    allTimeReferred,
  };
}

export async function fetchTopReferrers(limit: number) {
  const prisma = getPrismaClient();
  const safeLimit = Math.max(1, Math.min(100, limit));
  return prisma.waitlistSubscriber.findMany({
    where: { referralsMade: { gt: 0 } },
    orderBy: [{ referralsMade: "desc" }, { createdAt: "asc" }],
    take: safeLimit,
    select: {
      id: true,
      email: true,
      referralCode: true,
      referralsMade: true,
      isVerified: true,
      createdAt: true,
    },
  });
}

export async function fetchDailyReferredSplit(from: Date, toInclusive: Date) {
  const prisma = getPrismaClient();
  const rows = await prisma.$queryRaw<
    { day: Date; referred: bigint; organic: bigint }[]
  >`
    SELECT date_trunc('day', s."createdAt" AT TIME ZONE 'UTC') AS day,
           COUNT(*) FILTER (WHERE s."referredById" IS NOT NULL)::bigint AS referred,
           COUNT(*) FILTER (WHERE s."referredById" IS NULL)::bigint AS organic
    FROM "WaitlistSubscriber" s
    WHERE s."createdAt" >= ${from}
      AND s."createdAt" <= ${toInclusive}
    GROUP BY 1
    ORDER BY 1 ASC
  `;
  const map = new Map<string, { referred: number; organic: number }>();
  for (const row of rows) {
    const key = row.day.toISOString().slice(0, 10);
    map.set(key, {
      referred: Number(row.referred),
      organic: Number(row.organic),
    });
  }
  return eachUtcDay(from, toInclusive).map((date) => ({
    date,
    referred: map.get(date)?.referred ?? 0,
    organic: map.get(date)?.organic ?? 0,
  }));
}
