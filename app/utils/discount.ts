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

export function getDiscountDescription(discount: any) {
  const { type, code, method, usageLimit, description, configuration } =
    discount;

  const config =
    typeof configuration === "string"
      ? JSON.parse(configuration)
      : configuration || {};

  let desc = "";

  if (type === "PERCENTAGE" && config.cartLinePercentage) {
    desc += `${config.cartLinePercentage}% off`;
  } else if (type === "FIXED_AMOUNT" && config.amount) {
    desc += `${config.amount} off`;
  } else if (type === "FREE_SHIPPING") {
    desc += `Free shipping`;
  }

  // Add product or code context
  if (method === "CODE" && code) {
    desc += ` with code ${code}`;
  }

  if (description && /minimum quantity of \d+/i.test(description)) {
    desc += ` • ${description.match(/minimum quantity of \d+/i)[0]}`;
  } else if (usageLimit) {
    desc += ` • Minimum quantity of ${usageLimit}`;
  }

  return desc.trim();
}
