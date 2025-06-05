import { DiscountStatus } from "@prisma/client";

export function determineDiscountStatus(startsAt: Date, endsAt: Date | null) {
  const now = new Date();

  if (startsAt > now) {
    return DiscountStatus.SCHEDULED;
  }

  if (endsAt && endsAt < now) {
    return DiscountStatus.EXPIRED;
  }

  return DiscountStatus.ACTIVE;
}