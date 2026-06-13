/** Copy for counselors with no incentive target row for the period (Implementation Map §6 Task 3). */

export function noTargetAchievementDetail(period: string): string {
  return `No target set for ${period} — contact your admin. Earnings still accrue from flat/percent rules; slab and bonus rules need a target.`;
}

export const NO_TARGET_WALLET_NOTE =
  "Unlock follows achievement; without a target, achievement cannot be computed.";
