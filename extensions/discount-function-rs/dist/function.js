// node_modules/@shopify/shopify_function/run.ts
function run_default(userfunction) {
  if (!Javy.JSON) {
    throw new Error("Javy.JSON is not defined. Please rebuild your function using the latest version of Shopify CLI.");
  }
  const input_obj = Javy.JSON.fromStdin();
  const output_obj = userfunction(input_obj);
  Javy.JSON.toStdout(output_obj);
}

// extensions/discount-function-rs/src/cart_lines_discounts_generate_run.ts
function cartLinesDiscountsGenerateRun(input) {
  if (!input.cart.lines.length) {
    throw new Error("No cart lines found");
  }
  const hasOrderDiscountClass = input.discount.discountClasses.includes(
    "ORDER" /* Order */
  );
  const hasProductDiscountClass = input.discount.discountClasses.includes(
    "PRODUCT" /* Product */
  );
  if (!hasOrderDiscountClass && !hasProductDiscountClass) {
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
            message: "10% OFF ORDER",
            targets: [
              {
                orderSubtotal: {
                  excludedCartLineIds: []
                }
              }
            ],
            value: {
              percentage: {
                value: 10
              }
            }
          }
        ],
        selectionStrategy: "FIRST" /* First */
      }
    });
  }
  if (hasProductDiscountClass) {
    operations.push({
      productDiscountsAdd: {
        candidates: [
          {
            message: "20% OFF PRODUCT",
            targets: [
              {
                cartLine: {
                  id: maxCartLine.id
                }
              }
            ],
            value: {
              percentage: {
                value: 20
              }
            }
          }
        ],
        selectionStrategy: "FIRST" /* First */
      }
    });
  }
  return {
    operations
  };
}

// extensions/discount-function-rs/src/cart_delivery_options_discounts_generate_run.ts
function cartDeliveryOptionsDiscountsGenerateRun(input) {
  const firstDeliveryGroup = input.cart.deliveryGroups[0];
  if (!firstDeliveryGroup) {
    throw new Error("No delivery groups found");
  }
  const hasShippingDiscountClass = input.discount.discountClasses.includes(
    "SHIPPING" /* Shipping */
  );
  if (!hasShippingDiscountClass) {
    return { operations: [] };
  }
  return {
    operations: [
      {
        deliveryDiscountsAdd: {
          candidates: [
            {
              message: "FREE DELIVERY",
              targets: [
                {
                  deliveryGroup: {
                    id: firstDeliveryGroup.id
                  }
                }
              ],
              value: {
                percentage: {
                  value: 100
                }
              }
            }
          ],
          selectionStrategy: "ALL" /* All */
        }
      }
    ]
  };
}

// <stdin>
function cartLinesDiscountsGenerateRun2() {
  return run_default(cartLinesDiscountsGenerateRun);
}
function cartDeliveryOptionsDiscountsGenerateRun2() {
  return run_default(cartDeliveryOptionsDiscountsGenerateRun);
}
export {
  cartDeliveryOptionsDiscountsGenerateRun2 as cartDeliveryOptionsDiscountsGenerateRun,
  cartLinesDiscountsGenerateRun2 as cartLinesDiscountsGenerateRun
};
