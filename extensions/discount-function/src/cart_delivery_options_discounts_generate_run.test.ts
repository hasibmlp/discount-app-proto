import {describe, it, expect} from "vitest";

import {cartDeliveryOptionsDiscountsGenerateRun} from "./cart_delivery_options_discounts_generate_run";
import {
  DeliveryDiscountSelectionStrategy,
  DiscountClass,
  DeliveryInput,
} from "../generated/api";

describe("cartDeliveryOptionsDiscountsGenerateRun", () => {
  const baseInput: DeliveryInput = {
    cart: {
      deliveryGroups: [
        {
          id: "gid://shopify/DeliveryGroup/0",
        },
      ],
    },
    discount: {
      discountClasses: [],
      metafield: {
        value: JSON.stringify({
          deliveryFixedAmount: 0,
          deliveryPercentage: 10,
          discountMessage: "10% off delivery",
        }),
      },
    },
  };

  it("returns empty operations when no shipping discount class and empty configuration", () => {
    const input: DeliveryInput = {
      ...baseInput,
      discount: {
        discountClasses: [],
        metafield: { value: "{}" },
      },
    };

    const result = cartDeliveryOptionsDiscountsGenerateRun(input);
    expect(result.operations).toHaveLength(0);
  });

  it("returns delivery discount with percentage when configuration is present", () => {
    const input: DeliveryInput = {
      ...baseInput,
      discount: {
        discountClasses: [],
        metafield: {
          value: JSON.stringify({
            deliveryFixedAmount: 0,
            deliveryPercentage: 10,
            discountMessage: "10% off delivery",
          }),
        },
      },
    };

    const result = cartDeliveryOptionsDiscountsGenerateRun(input);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toMatchObject({
      deliveryDiscountsAdd: {
        candidates: [
          {
            message: "10% off delivery",
            targets: [
              {
                deliveryGroup: {
                  id: "gid://shopify/DeliveryGroup/0",
                },
              },
            ],
            value: {
              percentage: {
                value: 10,
              },
            },
          },
        ],
        selectionStrategy: DeliveryDiscountSelectionStrategy.All,
      },
    });
  });

  it("returns delivery discount with fixed amount when configuration is present", () => {
    const input: DeliveryInput = {
      ...baseInput,
      discount: {
        discountClasses: [],
        metafield: {
          value: JSON.stringify({
            deliveryFixedAmount: 500,
            deliveryPercentage: 0,
            discountMessage: "$5 off delivery",
          }),
        },
      },
    };

    const result = cartDeliveryOptionsDiscountsGenerateRun(input);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toMatchObject({
      deliveryDiscountsAdd: {
        candidates: [
          {
            message: "$5 off delivery",
            targets: [
              {
                deliveryGroup: {
                  id: "gid://shopify/DeliveryGroup/0",
                },
              },
            ],
            value: {
              fixedAmount: {
                amount: 500,
              },
            },
          },
        ],
        selectionStrategy: DeliveryDiscountSelectionStrategy.All,
      },
    });
  });

  it("throws error when no delivery groups are present", () => {
    const input: DeliveryInput = {
      cart: {
        deliveryGroups: [],
      },
      discount: {
        discountClasses: [DiscountClass.Shipping],
        metafield: { value: "{}" },
      },
    };

    expect(() => cartDeliveryOptionsDiscountsGenerateRun(input)).toThrow(
      "No delivery groups found",
    );
  });

  it("throws error when discount configuration is invalid", () => {
    const input: DeliveryInput = {
      ...baseInput,
      discount: {
        discountClasses: [DiscountClass.Shipping],
        metafield: { value: "invalid json" },
      },
    };

    expect(() => cartDeliveryOptionsDiscountsGenerateRun(input)).toThrow(
      "Invalid discount configuration",
    );
  });
});