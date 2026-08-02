// Loads the waitlist and grades every subscriber into a send wave.
// Shared by the segmentation script, the send script, and the analytics
// dashboard so all three agree on who is in which wave.

import {
  BETA_CAMPAIGN,
  FARM_REFERRER_THRESHOLD,
  classifyWave,
  type InviteWave,
} from "./beta-invite";
import { getPrismaClient } from "./prisma";

export type GradedSubscriber = {
  subscriberId: string;
  email: string;
  wave: InviteWave;
};

/// One pass over the list. Returns every subscriber with their wave.
///
/// Written as a single raw query rather than Prisma `findMany` + N lookups:
/// the referral-count subquery has to run over the whole table to identify
/// farm referrers, and doing that per-row would be 10k round trips.
export async function gradeAudience(): Promise<GradedSubscriber[]> {
  const prisma = getPrismaClient();

  const rows = await prisma.$queryRaw<
    {
      id: string;
      email: string;
      isVerified: boolean;
      referredById: string | null;
      referrerIsFarm: boolean;
      openedSurvey: boolean;
      completedSurvey: boolean;
      unsubscribed: boolean;
      bounced: boolean;
      complained: boolean;
    }[]
  >`
    WITH farm_referrers AS (
      SELECT s.id
      FROM "WaitlistSubscriber" s
      JOIN "WaitlistSubscriber" r ON r."referredById" = s.id
      GROUP BY s.id
      HAVING count(r.id) > ${FARM_REFERRER_THRESHOLD}
    )
    SELECT
      w.id,
      w.email,
      w."isVerified"                                   AS "isVerified",
      w."referredById"                                 AS "referredById",
      (w."referredById" IN (SELECT id FROM farm_referrers)) IS TRUE
                                                       AS "referrerIsFarm",
      (resp.id IS NOT NULL)                            AS "openedSurvey",
      (resp."completedAt" IS NOT NULL)                 AS "completedSurvey",
      (i."unsubscribedAt" IS NOT NULL)                 AS "unsubscribed",
      (i."bouncedAt" IS NOT NULL)                      AS "bounced",
      (i."complainedAt" IS NOT NULL)                   AS "complained"
    FROM "WaitlistSubscriber" w
    LEFT JOIN "SurveyInvite"   i    ON i."subscriberId" = w.id
    LEFT JOIN "SurveyResponse" resp ON resp."inviteId"  = i.id
  `;

  return rows.map((r) => ({
    subscriberId: r.id,
    email: r.email,
    wave: classifyWave({
      email: r.email,
      isVerified: r.isVerified,
      referredById: r.referredById,
      referrerIsFarm: r.referrerIsFarm,
      openedSurvey: r.openedSurvey,
      completedSurvey: r.completedSurvey,
      unsubscribed: r.unsubscribed,
      bounced: r.bounced,
      complained: r.complained,
    }),
  }));
}

/// Counts per wave, for the dashboard and the pre-send summary.
export function tallyWaves(
  graded: GradedSubscriber[],
): Record<InviteWave, number> {
  const tally = {
    "wave-1-completed": 0,
    "wave-2-engaged": 0,
    "wave-3-organic": 0,
    "wave-4-referred": 0,
    "wave-5-farm": 0,
    excluded: 0,
  } satisfies Record<InviteWave, number>;
  for (const g of graded) tally[g.wave]++;
  return tally;
}

export { BETA_CAMPAIGN };
