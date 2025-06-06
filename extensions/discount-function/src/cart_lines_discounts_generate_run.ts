import {
  DiscountClass,
  OrderDiscountSelectionStrategy,
  ProductDiscountSelectionStrategy,
  CartInput,
  CartLinesDiscountsGenerateRunResult,
} from "../generated/api";

export function cartLinesDiscountsGenerateRun(
  input: CartInput
): CartLinesDiscountsGenerateRunResult {
  if (!input.cart.lines.length) {
    throw new Error("No cart lines found");
  }

  const hasOrderDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Order
  );
  const hasProductDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Product
  );

  let discountConfiguration: any;
  try {
    discountConfiguration = JSON.parse(input.discount.metafield?.value || "{}");
  } catch (error) {
    throw new Error("Invalid discount configuration");
  }

  if (
    !hasOrderDiscountClass &&
    !hasProductDiscountClass &&
    !discountConfiguration
  ) {
    return { operations: [] };
  }

  const maxCartLine = input.cart.lines.reduce((maxLine, line) => {
    if (line.cost.subtotalAmount.amount > maxLine.cost.subtotalAmount.amount) {
      return line;
    }
    return maxLine;
  }, input.cart.lines[0]);

  const operations = [];

  if (hasOrderDiscountClass) {
    operations.push({
      orderDiscountsAdd: {
        candidates: [
          {
            message: discountConfiguration.discountMessage,
            targets: [
              {
                orderSubtotal: {
                  excludedCartLineIds: [],
                },
              },
            ],
            value:
              discountConfiguration.orderFixedAmount > 0
                ? {
                    fixedAmount: {
                      amount: discountConfiguration.orderFixedAmount,
                    },
                  }
                : {
                    percentage: {
                      value: discountConfiguration.orderPercentage,
                    },
                  },
          },
        ],
        selectionStrategy: OrderDiscountSelectionStrategy.First,
      },
    });
  }

  if (hasProductDiscountClass) {
    operations.push({
      productDiscountsAdd: {
        candidates: [
          {
            message: discountConfiguration.discountMessage,
            targets: [
              {
                cartLine: {
                  id: maxCartLine.id,
                },
              },
            ],
            value:
              discountConfiguration.cartLineFixedAmount > 0
                ? {
                    fixedAmount: {
                      amount: discountConfiguration.cartLineFixedAmount,
                    },
                  }
                : {
                    percentage: {
                      value: discountConfiguration.productPercentage,
                    },
                  },
          },
        ],
        selectionStrategy: ProductDiscountSelectionStrategy.First,
      },
    });
  }

  return {
    operations,
  };
}
