import { determineDiscountStatus } from "~/utils/discount";
import {
  CREATE_CODE_DISCOUNT,
  CREATE_AUTOMATIC_DISCOUNT,
  UPDATE_CODE_DISCOUNT,
  UPDATE_AUTOMATIC_DISCOUNT,
  GET_DISCOUNT,
  DELETE_CODE_DISCOUNT,
  DELETE_AUTOMATIC_DISCOUNT,
  DISCOUNT_AUTOMATIC_BULK_ACTIVATE,
  DISCOUNT_CODE_BULK_ACTIVATE,
  DISCOUNT_AUTOMATIC_BULK_DEACTIVATE,
  DISCOUNT_CODE_BULK_DEACTIVATE,
} from "../graphql/discounts";
import { authenticate } from "../shopify.server";
import type { DiscountClass } from "../types/admin.types";
import { DiscountMethod } from "../types/types";
import { DiscountType, Discount, CombinesWith } from "@prisma/client";
import { GET_TOP_DISCOUNTED_PRODUCTS } from "~/graphql/products";
import prisma from "../db.server";

interface BaseDiscount {
  functionId?: string;
  title: string;
  discountClasses: DiscountClass[];
  combinesWith: {
    orderDiscounts: boolean;
    productDiscounts: boolean;
    shippingDiscounts: boolean;
  };
  startsAt: Date;
  endsAt: Date | null;
}

interface DiscountConfiguration {
  cartLinePercentage: number;
  orderPercentage: number;
  deliveryPercentage: number;
  cartLineFixedAmount: number;
  orderFixedAmount: number;
  deliveryFixedAmount: number;
  collectionIds?: string[];
}

interface UserError {
  code?: string;
  message: string;
  field?: string[];
}

interface DeleteDiscountResult {
  success: boolean;
  error?: string;
}

export async function getDiscount(request: Request, id: string) {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(GET_DISCOUNT, {
    variables: {
      id: `gid://shopify/DiscountNode/${id}`,
    },
  });

  const responseJson = await response.json();
  if (
    !responseJson.data.discountNode ||
    !responseJson.data.discountNode.discount
  ) {
    return { discount: null };
  }

  const method =
    responseJson.data.discountNode.discount.__typename === "DiscountCodeApp"
      ? DiscountMethod.Code
      : DiscountMethod.Automatic;

  const {
    title,
    codes,
    combinesWith,
    usageLimit,
    appliesOncePerCustomer,
    startsAt,
    endsAt,
    discountClasses,
  } = responseJson.data.discountNode.discount;
  const configuration = JSON.parse(
    responseJson.data.discountNode.configurationField.value
  );

  return {
    discount: {
      title,
      method,
      code: codes?.nodes[0]?.code ?? "",
      combinesWith,
      discountClasses,
      usageLimit: usageLimit ?? null,
      appliesOncePerCustomer: appliesOncePerCustomer ?? false,
      startsAt,
      endsAt,
      configuration: {
        ...configuration,
        metafieldId: responseJson.data.discountNode.configurationField.id,
      },
    },
  };
}

export async function getDiscounts() {
  const discounts = await prisma.discount.findMany();
  return discounts.map((discount) => ({
    id: discount.id,
    shopifyDiscountId: discount.shopifyDiscountId,
    title: discount.name,
    method: discount.discountMethod,
    type: discount.discountType,
    code: discount.code,
    combinesWith: {
      orderDiscounts: false,
      productDiscounts: false,
      shippingDiscounts: false,
    },
    startsAt: discount.startsAt,
    endsAt: discount.endsAt,
    createdAt: discount.createdAt,
    status: discount.status,
    used: discount.usedCount,
    usageLimit: discount.usageLimit,
    configuration: JSON.parse(discount.configuration as string),
  }));
}

export async function getTopDiscountedProducts(request: Request) {
  const { session } = await authenticate.admin(request);
  const { admin } = await authenticate.admin(request);

  // Get orders from the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const response = await admin.graphql(GET_TOP_DISCOUNTED_PRODUCTS, {
    variables: {
      query: `created_at:>${thirtyDaysAgo.toISOString()} AND discount_applications:*`,
    },
  });

  const responseJson = await response.json();
  const orders = responseJson.data.orders.edges;

  // Count product discounts
  const productDiscounts = new Map();
  for (const { node: order } of orders as Array<{
    node: {
      discountApplications: {
        edges: Array<{
          node: {
            type: string;
            title?: string;
            code?: string;
          };
        }>;
      };
      lineItems: {
        edges: Array<{
          node: {
            product?: {
              id: string;
              title: string;
              featuredImage?: { url: string };
            };
          };
        }>;
      };
    };
  }>) {
    const hasDiscount = order.discountApplications.edges.length > 0;
    if (hasDiscount) {
      // Get discount from local DB
      const discountApplication = order.discountApplications.edges[0].node;
      let discountIdentifier: string | null =
        discountApplication.title || discountApplication.code || null;

      if (discountIdentifier && discountIdentifier !== "") {
        const discountInDb = await prisma.discount.findUnique({
          where: {
            shop_name_unique_constraint: {
              shop: session.shop,
              name: discountIdentifier,
            },
          },
        });

        if (discountInDb) {
          // Only count products if the discount is from our app
          for (const { node: item } of order.lineItems.edges) {
            if (item.product) {
              const key = item.product.id;
              const count = productDiscounts.get(key) || 0;
              productDiscounts.set(key, count + 1);
            }
          }
        }
      }
    }
  }

  // Convert to array and sort by count
  return Array.from(productDiscounts.entries())
    .map(([productId, usageCount]) => {
      const product = orders
        .find(({ node: order }) =>
          order.lineItems.edges.some(
            ({ node: item }) => item.product?.id === productId
          )
        )
        ?.node.lineItems.edges.find(
          ({ node: item }) => item.product?.id === productId
        )?.node.product;

      return {
        productId: productId.replace("gid://shopify/Product/", ""),
        usageCount,
        shop: session.shop,
        productTitle: product?.title || "",
        featuredImage: product?.featuredImage?.url || null,
      };
    })
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 10);
}

export async function getDiscountUsage(request: Request) {
  const { session } = await authenticate.admin(request);
  const response = await prisma.discountUsage.findMany({
    where: {
      shop: session.shop,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  });
  return response;
}

// Mutations

export async function createCodeDiscount(
  request: Request,
  baseDiscount: BaseDiscount,
  code: string,
  usageLimit: number | null,
  appliesOncePerCustomer: boolean,
  configuration: DiscountConfiguration
) {
  const { admin, session } = await authenticate.admin(request);
  const shopDomain = session.shop;
  const response = await admin.graphql(CREATE_CODE_DISCOUNT, {
    variables: {
      discount: {
        ...baseDiscount,
        title: code,
        code,
        usageLimit,
        appliesOncePerCustomer,
        metafields: [
          {
            namespace: "$app:example-discounts--ui-extension",
            key: "function-configuration",
            type: "json",
            value: JSON.stringify({
              cartLinePercentage: configuration.cartLinePercentage,
              orderPercentage: configuration.orderPercentage,
              deliveryPercentage: configuration.deliveryPercentage,
              cartLineFixedAmount: configuration.cartLineFixedAmount,
              orderFixedAmount: configuration.orderFixedAmount,
              deliveryFixedAmount: configuration.deliveryFixedAmount,
              collectionIds: configuration.collectionIds || [],
              discountMessage: baseDiscount.title,
            }),
          },
        ],
      },
    },
  });

  const responseJson = await response.json();
  const shopifyUserErrors = responseJson.data.discountCreate
    ?.userErrors as UserError[];

  console.log(responseJson.data.discountCreate);

  if (shopifyUserErrors.length > 0) {
    return {
      errors: shopifyUserErrors,
      discount: null,
    };
  }

  if (!responseJson.data.discountCreate.codeAppDiscount) {
    return {
      errors: shopifyUserErrors,
      discount: null,
    };
  }

  const {
    discountId: shopifyDiscountId,
    codes: shopifyDiscountCodes,
    combinesWith: shopifyDiscountCombinesWith,
    usageLimit: shopifyDiscountUsageLimit,
    appliesOncePerCustomer: shopifyDiscountAppliesOncePerCustomer,
    startsAt: shopifyDiscountStartsAt,
    endsAt: shopifyDiscountEndsAt,
    discountClasses: shopifyDiscountDiscountClasses,
    metafields: shopifyDiscountMetafields,
  } = responseJson.data.discountCreate.codeAppDiscount;

  if (
    !shopifyDiscountId ||
    !shopifyDiscountCodes ||
    !shopifyDiscountStartsAt ||
    !shopifyDiscountDiscountClasses
  ) {
    return {
      errors: [
        ...(shopifyUserErrors || []),
        {
          field: ["shopify"],
          message: "Failed to create discount on Shopify or retrieve its ID.",
        },
      ] as UserError[],
      discount: null,
    };
  }

  let discountRecord: Discount | null = null;
  try {
    discountRecord = await prisma.discount.create({
      data: {
        shop: shopDomain,
        shopifyDiscountId: shopifyDiscountId,
        name: code,
        code: code,
        discountMethod: DiscountMethod.Code,
        discountType: DiscountType.FIXED_AMOUNT,
        usageLimit: shopifyDiscountUsageLimit,
        limitPerCustomer: shopifyDiscountAppliesOncePerCustomer ? 1 : null,
        startsAt: shopifyDiscountStartsAt,
        endsAt: shopifyDiscountEndsAt,
        status: determineDiscountStatus(
          shopifyDiscountStartsAt,
          shopifyDiscountEndsAt
        ),
        combinesWith: shopifyDiscountCombinesWith.orderDiscounts
          ? CombinesWith.ORDER_DISCOUNT
          : shopifyDiscountCombinesWith.productDiscounts
            ? CombinesWith.PRODUCT_DISCOUNT
            : shopifyDiscountCombinesWith.shippingDiscounts
              ? CombinesWith.SHIPPING_DISCOUNT
              : CombinesWith.ALL,
        configuration: JSON.stringify({
          cartLinePercentage: configuration.cartLinePercentage,
          orderPercentage: configuration.orderPercentage,
          deliveryPercentage: configuration.deliveryPercentage,
          cartLineFixedAmount: configuration.cartLineFixedAmount,
          orderFixedAmount: configuration.orderFixedAmount,
          deliveryFixedAmount: configuration.deliveryFixedAmount,
          collectionIds: configuration.collectionIds || [],
        }),
      },
    });

    if (!discountRecord) {
      return {
        errors: [
          {
            field: ["database"],
            message: "Failed to save discount to local database",
          },
        ],
        discount: null,
      };
    }
  } catch (error: any) {
    console.error(error);
    return {
      errors: [
        ...(shopifyUserErrors || []),
        {
          field: ["database"],
          message: `Failed to save discount to local database: ${error.message}`,
        },
      ] as UserError[],
      discount: null,
    };
  }

  return {
    errors: responseJson.data.discountCreate?.userErrors as UserError[],
    discount: discountRecord,
  };
}

export async function createAutomaticDiscount(
  request: Request,
  baseDiscount: BaseDiscount,
  configuration: DiscountConfiguration
) {
  const { admin, session } = await authenticate.admin(request);
  const shopDomain = session.shop;
  const response = await admin.graphql(CREATE_AUTOMATIC_DISCOUNT, {
    variables: {
      discount: {
        ...baseDiscount,
        metafields: [
          {
            namespace: "$app:example-discounts--ui-extension",
            key: "function-configuration",
            type: "json",
            value: JSON.stringify({
              cartLinePercentage: configuration.cartLinePercentage,
              orderPercentage: configuration.orderPercentage,
              deliveryPercentage: configuration.deliveryPercentage,
              collectionIds: configuration.collectionIds || [],
              discountMessage: baseDiscount.title,
            }),
          },
        ],
      },
    },
  });

  const responseJson = await response.json();
  const shopifyUserErrors = responseJson.data.discountCreate
    ?.userErrors as UserError[];

  if (shopifyUserErrors.length > 0) {
    return {
      errors: shopifyUserErrors,
      discount: null,
    };
  }

  const shopifyDiscount = responseJson.data.discountCreate.automaticAppDiscount;
  if (!shopifyDiscount || !shopifyDiscount.discountId) {
    return {
      errors: [
        ...(shopifyUserErrors || []),
        {
          field: ["shopify"],
          message:
            "Failed to create automatic discount on Shopify or retrieve its ID.",
        },
      ] as UserError[],
      discount: null,
    };
  }

  let discountRecord: Discount | null = null;
  try {
    discountRecord = await prisma.discount.create({
      data: {
        shop: shopDomain,
        shopifyDiscountId: shopifyDiscount.discountId,
        name: baseDiscount.title,
        code: "",
        discountMethod: DiscountMethod.Automatic,
        discountType: DiscountType.PERCENTAGE,
        usageLimit: null,
        limitPerCustomer: null,
        startsAt: baseDiscount.startsAt,
        endsAt: baseDiscount.endsAt,
        status: determineDiscountStatus(
          baseDiscount.startsAt,
          baseDiscount.endsAt
        ),
        combinesWith: baseDiscount.combinesWith.orderDiscounts
          ? CombinesWith.ORDER_DISCOUNT
          : baseDiscount.combinesWith.productDiscounts
            ? CombinesWith.PRODUCT_DISCOUNT
            : baseDiscount.combinesWith.shippingDiscounts
              ? CombinesWith.SHIPPING_DISCOUNT
              : CombinesWith.ALL,
        configuration: JSON.stringify({
          cartLinePercentage: configuration.cartLinePercentage,
          orderPercentage: configuration.orderPercentage,
          deliveryPercentage: configuration.deliveryPercentage,
          cartLineFixedAmount: configuration.cartLineFixedAmount,
          orderFixedAmount: configuration.orderFixedAmount,
          deliveryFixedAmount: configuration.deliveryFixedAmount,
          collectionIds: configuration.collectionIds || [],
        }),
      },
    });

    if (!discountRecord) {
      return {
        errors: [
          {
            field: ["database"],
            message: "Failed to save automatic discount to local database",
          },
        ],
        discount: null,
      };
    }
  } catch (error: any) {
    console.error(error);
    return {
      errors: [
        ...(shopifyUserErrors || []),
        {
          field: ["database"],
          message: `Failed to save automatic discount to local database: ${error.message}`,
        },
      ] as UserError[],
      discount: null,
    };
  }

  return {
    errors: [],
    discount: discountRecord,
  };
}

export async function updateCodeDiscount(
  request: Request,
  id: string,
  baseDiscount: BaseDiscount,
  code: string,
  usageLimit: number | null,
  appliesOncePerCustomer: boolean,
  configuration: {
    metafieldId: string;
    cartLinePercentage: number;
    orderPercentage: number;
    deliveryPercentage: number;
    cartLineFixedAmount: number;
    orderFixedAmount: number;
    deliveryFixedAmount: number;
    collectionIds?: string[];
  }
) {
  const { admin } = await authenticate.admin(request);
  const discountId = id.includes("gid://")
    ? id
    : `gid://shopify/DiscountCodeNode/${id}`;

  const response = await admin.graphql(UPDATE_CODE_DISCOUNT, {
    variables: {
      id: discountId,
      discount: {
        ...baseDiscount,
        title: code,
        code,
        usageLimit,
        appliesOncePerCustomer,
        metafields: [
          {
            id: configuration.metafieldId,
            value: JSON.stringify({
              cartLinePercentage: configuration.cartLinePercentage,
              orderPercentage: configuration.orderPercentage,
              deliveryPercentage: configuration.deliveryPercentage,
              collectionIds:
                configuration.collectionIds?.map((id) =>
                  id.includes("gid://") ? id : `gid://shopify/Collection/${id}`
                ) || [],
            }),
          },
        ],
      },
    },
  });

  const responseJson = await response.json();
  const shopifyUserErrors = responseJson.data.discountUpdate
    ?.userErrors as UserError[];

  if (shopifyUserErrors.length > 0) {
    return { errors: shopifyUserErrors };
  }

  try {
    // Update local database
    await prisma.discount.update({
      where: {
        shopifyDiscountId: discountId,
      },
      data: {
        name: code,
        code: code,
        discountMethod: DiscountMethod.Code,
        discountType: DiscountType.PERCENTAGE,
        usageLimit: usageLimit,
        limitPerCustomer: appliesOncePerCustomer ? 1 : null,
        startsAt: baseDiscount.startsAt,
        endsAt: baseDiscount.endsAt,
        status: determineDiscountStatus(
          baseDiscount.startsAt,
          baseDiscount.endsAt
        ),
        combinesWith: baseDiscount.combinesWith.orderDiscounts
          ? CombinesWith.ORDER_DISCOUNT
          : baseDiscount.combinesWith.productDiscounts
            ? CombinesWith.PRODUCT_DISCOUNT
            : baseDiscount.combinesWith.shippingDiscounts
              ? CombinesWith.SHIPPING_DISCOUNT
              : CombinesWith.ALL,
        configuration: JSON.stringify({
          cartLinePercentage: configuration.cartLinePercentage,
          orderPercentage: configuration.orderPercentage,
          deliveryPercentage: configuration.deliveryPercentage,
          cartLineFixedAmount: configuration.cartLineFixedAmount,
          orderFixedAmount: configuration.orderFixedAmount,
          deliveryFixedAmount: configuration.deliveryFixedAmount,
          collectionIds: configuration.collectionIds || [],
        }),
      },
    });

    return { errors: [] };
  } catch (error) {
    console.error("Error updating discount in database:", error);
    return {
      errors: [
        {
          field: ["database"],
          message:
            error instanceof Error
              ? error.message
              : "Failed to update discount in database",
        },
      ],
    };
  }
}

export async function updateAutomaticDiscount(
  request: Request,
  id: string,
  baseDiscount: BaseDiscount,
  configuration: {
    metafieldId: string;
    cartLinePercentage: number;
    orderPercentage: number;
    deliveryPercentage: number;
    cartLineFixedAmount: number;
    orderFixedAmount: number;
    deliveryFixedAmount: number;
    collectionIds?: string[];
  }
) {
  const { admin } = await authenticate.admin(request);
  const discountId = id.includes("gid://")
    ? id
    : `gid://shopify/DiscountAutomaticApp/${id}`;

  const response = await admin.graphql(UPDATE_AUTOMATIC_DISCOUNT, {
    variables: {
      id: discountId,
      discount: {
        ...baseDiscount,
        metafields: [
          {
            id: configuration.metafieldId,
            value: JSON.stringify({
              cartLinePercentage: configuration.cartLinePercentage,
              orderPercentage: configuration.orderPercentage,
              deliveryPercentage: configuration.deliveryPercentage,
              collectionIds:
                configuration.collectionIds?.map((id) =>
                  id.includes("gid://") ? id : `gid://shopify/Collection/${id}`
                ) || [],
            }),
          },
        ],
      },
    },
  });

  const responseJson = await response.json();
  const shopifyUserErrors = responseJson.data.discountUpdate
    ?.userErrors as UserError[];

  if (shopifyUserErrors.length > 0) {
    return { errors: shopifyUserErrors };
  }

  try {
    // Update local database
    await prisma.discount.update({
      where: {
        shopifyDiscountId: discountId,
      },
      data: {
        name: baseDiscount.title,
        discountMethod: DiscountMethod.Automatic,
        discountType: DiscountType.PERCENTAGE,
        startsAt: baseDiscount.startsAt,
        endsAt: baseDiscount.endsAt,
        status: determineDiscountStatus(
          baseDiscount.startsAt,
          baseDiscount.endsAt
        ),
        combinesWith: baseDiscount.combinesWith.orderDiscounts
          ? CombinesWith.ORDER_DISCOUNT
          : baseDiscount.combinesWith.productDiscounts
            ? CombinesWith.PRODUCT_DISCOUNT
            : baseDiscount.combinesWith.shippingDiscounts
              ? CombinesWith.SHIPPING_DISCOUNT
              : CombinesWith.ALL,
        configuration: JSON.stringify({
          cartLinePercentage: configuration.cartLinePercentage,
          orderPercentage: configuration.orderPercentage,
          deliveryPercentage: configuration.deliveryPercentage,
          cartLineFixedAmount: configuration.cartLineFixedAmount,
          orderFixedAmount: configuration.orderFixedAmount,
          deliveryFixedAmount: configuration.deliveryFixedAmount,
          collectionIds: configuration.collectionIds || [],
        }),
      },
    });

    return { errors: [] };
  } catch (error) {
    console.error("Error updating discount in database:", error);
    return {
      errors: [
        {
          field: ["database"],
          message:
            error instanceof Error
              ? error.message
              : "Failed to update discount in database",
        },
      ],
    };
  }
}

export async function deleteDiscountDB(id: string) {
  await prisma.discount.delete({
    where: {
      shopifyDiscountId: id,
    },
  });
  return {
    success: true,
  };
}

async function deleteShopifyDiscounts(
  admin: any,
  codeDiscountIds: string[],
  automaticDiscountIds: string[]
): Promise<DeleteDiscountResult> {
  try {
    if (codeDiscountIds.length > 0) {
      const codeResponse = await admin.graphql(DELETE_CODE_DISCOUNT, {
        variables: { ids: codeDiscountIds },
      });
      const codeResult = await codeResponse.json();
      if (codeResult.data.discountCodeBulkDelete.userErrors.length > 0) {
        throw new Error("Failed to delete code discounts from Shopify");
      }
    }

    if (automaticDiscountIds.length > 0) {
      const autoResponse = await admin.graphql(DELETE_AUTOMATIC_DISCOUNT, {
        variables: { ids: automaticDiscountIds },
      });
      const autoResult = await autoResponse.json();
      if (autoResult.data.discountAutomaticBulkDelete.userErrors.length > 0) {
        throw new Error("Failed to delete automatic discounts from Shopify");
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting Shopify discounts:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete discounts from Shopify",
    };
  }
}

export async function deleteDiscountBulk(
  request: Request,
  shopifyIds: string[]
): Promise<DeleteDiscountResult> {
  if (!shopifyIds.length) {
    return {
      success: false,
      error: "No discounts selected for deletion",
    };
  }

  const { admin } = await authenticate.admin(request);

  // Separate discounts by type
  const codeDiscountIds = shopifyIds.filter((id) =>
    id.includes("DiscountCodeNode")
  );
  const automaticDiscountIds = shopifyIds.filter((id) =>
    id.includes("DiscountAutomaticApp")
  );

  if (!codeDiscountIds.length && !automaticDiscountIds.length) {
    return {
      success: false,
      error: "Invalid discount IDs provided",
    };
  }

  try {
    const shopifyResult = await deleteShopifyDiscounts(
      admin,
      codeDiscountIds,
      automaticDiscountIds
    );
    if (!shopifyResult.success) {
      return shopifyResult;
    }

    await prisma.discount.deleteMany({
      where: {
        shopifyDiscountId: {
          in: shopifyIds,
        },
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error in deleteDiscountBulk:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete discounts",
    };
  }
}

async function updateShopifyDiscountStatus(
  admin: any,
  codeDiscountIds: string[],
  automaticDiscountIds: string[],
  action: "activate" | "deactivate"
): Promise<DeleteDiscountResult> {
  try {
    if (codeDiscountIds.length > 0) {
      const mutation =
        action === "activate"
          ? DISCOUNT_CODE_BULK_ACTIVATE
          : DISCOUNT_CODE_BULK_DEACTIVATE;
      const codeResponse = await admin.graphql(mutation, {
        variables: { ids: codeDiscountIds },
      });
      const codeResult = await codeResponse.json();
      if (
        codeResult.data[
          `discountCodeBulk${action === "activate" ? "Activate" : "Deactivate"}`
        ].userErrors.length > 0
      ) {
        throw new Error(`Failed to ${action} code discounts in Shopify`);
      }
    }

    if (automaticDiscountIds.length > 0) {
      const mutation =
        action === "activate"
          ? DISCOUNT_AUTOMATIC_BULK_ACTIVATE
          : DISCOUNT_AUTOMATIC_BULK_DEACTIVATE;
      const autoResponse = await admin.graphql(mutation, {
        variables: { ids: automaticDiscountIds },
      });
      const autoResult = await autoResponse.json();
      if (
        autoResult.data[
          `discountAutomaticBulk${action === "activate" ? "Activate" : "Deactivate"}`
        ].userErrors.length > 0
      ) {
        throw new Error(`Failed to ${action} automatic discounts in Shopify`);
      }
    }

    return { success: true };
  } catch (error) {
    console.error(`Error ${action}ing Shopify discounts:`, error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : `Failed to ${action} discounts in Shopify`,
    };
  }
}

export async function updateDiscountStatusBulk(
  request: Request,
  shopifyIds: string[],
  action: "activate" | "deactivate"
): Promise<DeleteDiscountResult> {
  if (!shopifyIds.length) {
    return {
      success: false,
      error: `No discounts selected for ${action}ion`,
    };
  }

  const { admin } = await authenticate.admin(request);

  const codeDiscountIds = shopifyIds.filter((id) =>
    id.includes("DiscountCodeNode")
  );
  const automaticDiscountIds = shopifyIds.filter((id) =>
    id.includes("DiscountAutomaticApp")
  );

  if (!codeDiscountIds.length && !automaticDiscountIds.length) {
    return {
      success: false,
      error: "Invalid discount IDs provided",
    };
  }

  try {
    const shopifyResult = await updateShopifyDiscountStatus(
      admin,
      codeDiscountIds,
      automaticDiscountIds,
      action
    );
    if (!shopifyResult.success) {
      return shopifyResult;
    }

    // Update local database
    await prisma.discount.updateMany({
      where: {
        shopifyDiscountId: {
          in: shopifyIds,
        },
      },
      data: {
        status: action === "activate" ? "ACTIVE" : "DEACTIVATED",
      },
    });

    return { success: true };
  } catch (error) {
    console.error(`Error in updateDiscountStatusBulk:`, error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : `Failed to ${action} discounts`,
    };
  }
}
