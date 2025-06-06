import {
  DeliveryDiscountSelectionStrategy,
  DiscountClass,
  DeliveryInput,
  CartDeliveryOptionsDiscountsGenerateRunResult,
} from "../generated/api";

export function cartDeliveryOptionsDiscountsGenerateRun(
  input: DeliveryInput
): CartDeliveryOptionsDiscountsGenerateRunResult {
  const firstDeliveryGroup = input.cart.deliveryGroups[0];
  if (!firstDeliveryGroup) {
    throw new Error("No delivery groups found");
  }

  const hasShippingDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Shipping
  );

  let discountConfiguration: any;
  try {
    discountConfiguration = JSON.parse(input.discount.metafield?.value || "{}");
  } catch (error) {
    throw new Error("Invalid discount configuration");
  }

  const hasValidConfiguration = 
    discountConfiguration.deliveryFixedAmount > 0 || 
    discountConfiguration.deliveryPercentage > 0;

  if (!hasShippingDiscountClass && !hasValidConfiguration) {
    return { operations: [] };
  }

  const value =
    discountConfiguration.deliveryFixedAmount > 0
      ? {
          fixedAmount: {
            amount: discountConfiguration.deliveryFixedAmount,
          },
        }
      : {
          percentage: {
            value: discountConfiguration.deliveryPercentage,
          },
        };

  return {
    operations: [
      {
        deliveryDiscountsAdd: {
          candidates: [
            {
              message: discountConfiguration.discountMessage,
              targets: [
                {
                  deliveryGroup: {
                    id: firstDeliveryGroup.id,
                  },
                },
              ],
              value,
            },
          ],
          selectionStrategy: DeliveryDiscountSelectionStrategy.All,
        },
      },
    ],
  };
}
