import {describe, it, expect} from "vitest";

import {cartLinesDiscountsGenerateRun} from "./cart_lines_discounts_generate_run";
import {
  OrderDiscountSelectionStrategy,
  ProductDiscountSelectionStrategy,
  DiscountClass,
  CartInput,
} from "../generated/api";

describe("cartLinesDiscountsGenerateRun", () => {
  const baseInput: CartInput = {
    cart: {
      lines: [
        {
          id: "gid://shopify/CartLine/0",
          cost: {
            subtotalAmount: {
              amount: 100,
            },
          },
        },
        {
          id: "gid://shopify/CartLine/1",
          cost: {
            subtotalAmount: {
              amount: 200,
            },
          },
        },
      ],
    },
    discount: {
      discountClasses: [],
      metafield: {
        value: JSON.stringify({
          orderFixedAmount: 0,
          orderPercentage: 10,
          cartLineFixedAmount: 0,
          productPercentage: 20,
          discountMessage: "Test discount",
        }),
      },
    },
  };

  it("returns empty operations when no discount classes and no configuration", () => {
    const input: CartInput = {
      ...baseInput,
      discount: {
        discountClasses: [],
        metafield: { value: "{}" },
      },
    };

    const result = cartLinesDiscountsGenerateRun(input);
    expect(result.operations).toHaveLength(0);
  });

  it("returns order discount with percentage when order discount class is present", () => {
    const input: CartInput = {
      ...baseInput,
      discount: {
        discountClasses: [DiscountClass.Order],
        metafield: {
          value: JSON.stringify({
            orderFixedAmount: 0,
            orderPercentage: 10,
            discountMessage: "10% off order",
          }),
        },
      },
    };

    const result = cartLinesDiscountsGenerateRun(input);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toMatchObject({
      orderDiscountsAdd: {
        candidates: [
          {
            message: "10% off order",
            targets: [
              {
                orderSubtotal: {
                  excludedCartLineIds: [],
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
        selectionStrategy: OrderDiscountSelectionStrategy.First,
      },
    });
  });

  it("returns order discount with fixed amount when order discount class is present", () => {
    const input: CartInput = {
      ...baseInput,
      discount: {
        discountClasses: [DiscountClass.Order],
        metafield: {
          value: JSON.stringify({
            orderFixedAmount: 500,
            orderPercentage: 0,
            discountMessage: "$5 off order",
          }),
        },
      },
    };

    const result = cartLinesDiscountsGenerateRun(input);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toMatchObject({
      orderDiscountsAdd: {
        candidates: [
          {
            message: "$5 off order",
            targets: [
              {
                orderSubtotal: {
                  excludedCartLineIds: [],
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
        selectionStrategy: OrderDiscountSelectionStrategy.First,
      },
    });
  });

  it("returns product discount for highest value line when product discount class is present", () => {
    const input: CartInput = {
      ...baseInput,
      discount: {
        discountClasses: [DiscountClass.Product],
        metafield: {
          value: JSON.stringify({
            cartLineFixedAmount: 0,
            productPercentage: 20,
            discountMessage: "20% off product",
          }),
        },
      },
    };

    const result = cartLinesDiscountsGenerateRun(input);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toMatchObject({
      productDiscountsAdd: {
        candidates: [
          {
            message: "20% off product",
            targets: [
              {
                cartLine: {
                  id: "gid://shopify/CartLine/1",
                },
              },
            ],
            value: {
              percentage: {
                value: 20,
              },
            },
          },
        ],
        selectionStrategy: ProductDiscountSelectionStrategy.First,
      },
    });
  });

  it("returns product discount with fixed amount when product discount class is present", () => {
    const input: CartInput = {
      ...baseInput,
      discount: {
        discountClasses: [DiscountClass.Product],
        metafield: {
          value: JSON.stringify({
            cartLineFixedAmount: 500,
            productPercentage: 0,
            discountMessage: "$5 off product",
          }),
        },
      },
    };

    const result = cartLinesDiscountsGenerateRun(input);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toMatchObject({
      productDiscountsAdd: {
        candidates: [
          {
            message: "$5 off product",
            targets: [
              {
                cartLine: {
                  id: "gid://shopify/CartLine/1",
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
        selectionStrategy: ProductDiscountSelectionStrategy.First,
      },
    });
  });

  it("throws error when no cart lines are present", () => {
    const input: CartInput = {
      cart: {
        lines: [],
      },
      discount: {
        discountClasses: [DiscountClass.Order],
        metafield: { value: "{}" },
      },
    };

    expect(() => cartLinesDiscountsGenerateRun(input)).toThrow(
      "No cart lines found",
    );
  });

  it("throws error when discount configuration is invalid", () => {
    const input: CartInput = {
      ...baseInput,
      discount: {
        discountClasses: [DiscountClass.Order],
        metafield: { value: "invalid json" },
      },
    };

    expect(() => cartLinesDiscountsGenerateRun(input)).toThrow(
      "Invalid discount configuration",
    );
  });
});