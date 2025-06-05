import { determineDiscountStatus } from "~/utils/discount";
import {
  CREATE_CODE_DISCOUNT,
  CREATE_AUTOMATIC_DISCOUNT,
  UPDATE_CODE_DISCOUNT,
  UPDATE_AUTOMATIC_DISCOUNT,
  GET_DISCOUNT,
} from "../graphql/discounts";
import { authenticate } from "../shopify.server";
import type { DiscountClass, Discount as ShopifyDiscount } from "../types/admin.types";
import { DiscountMethod } from "../types/types";
import { DiscountType, Discount } from "@prisma/client";

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
  collectionIds?: string[];
}

interface UserError {
  code?: string;
  message: string;
  field?: string[];
}

export async function createCodeDiscount(
  request: Request,
  baseDiscount: BaseDiscount,
  code: string,
  usageLimit: number | null,
  appliesOncePerCustomer: boolean,
  configuration: DiscountConfiguration,
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
              collectionIds: configuration.collectionIds || [],
            }),
          },
        ],
      },
    },
  });

  const responseJson = await response.json();
  const shopifyUserErrors = responseJson.data.discountCreate?.userErrors as UserError[];

  console.log(responseJson.data.discountCreate);

  const {
    discountId: shopifyDiscountId,
    title: shopifyDiscountTitle,
    codes: shopifyDiscountCodes,
    combinesWith: shopifyDiscountCombinesWith,
    usageLimit: shopifyDiscountUsageLimit,
    appliesOncePerCustomer: shopifyDiscountAppliesOncePerCustomer,
    startsAt: shopifyDiscountStartsAt,
    endsAt: shopifyDiscountEndsAt,
    discountClasses: shopifyDiscountDiscountClasses,
  } = responseJson.data.discountCreate.codeAppDiscount;

  if(shopifyUserErrors.length > 0) {
    return {
      errors: shopifyUserErrors,
      discount: null,
    }
  }

  if (!shopifyDiscountTitle || !shopifyDiscountCodes || !shopifyDiscountCombinesWith || !shopifyDiscountUsageLimit || !shopifyDiscountAppliesOncePerCustomer || !shopifyDiscountStartsAt || !shopifyDiscountEndsAt || !shopifyDiscountDiscountClasses) {
    return {
      errors: [{ message: "Failed to create discount on Shopify or retrieve its ID." }] as UserError[],
      discount: null,
      shopifyDiscount: null,
    };
  }

  let discountRecord: Discount | null = null;
  try {
    discountRecord = await prisma.discount.create({
      data: {
        shop: shopDomain,
        shopifyDiscountId: shopifyDiscountId,
        name: shopifyDiscountTitle,
        description: 'sample description',
        code: code,
        discountMethod: DiscountMethod.Code,
        discountType: DiscountType.PERCENTAGE,
        value: 10,
        usageLimit: shopifyDiscountUsageLimit,
        limitPerCustomer: shopifyDiscountAppliesOncePerCustomer ? 1 : null,
        startsAt: shopifyDiscountStartsAt,
        endsAt: shopifyDiscountEndsAt,
        status: determineDiscountStatus(shopifyDiscountStartsAt, shopifyDiscountEndsAt),
      },
    });
  } catch (error: any) {
    console.error(error);
    return {
      errors: [
        ...(shopifyUserErrors || []),
        { field: ["database"], message: `Failed to save discount to local database: ${error.message}` }
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
  configuration: DiscountConfiguration,
) {
  const { admin } = await authenticate.admin(request);
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
            }),
          },
        ],
      },
    },
  });

  const responseJson = await response.json();

  return {
    errors: responseJson.data.discountCreate?.userErrors as UserError[],
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
    collectionIds?: string[];
  },
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
                  id.includes("gid://") ? id : `gid://shopify/Collection/${id}`,
                ) || [],
            }),
          },
        ],
      },
    },
  });

  const responseJson = await response.json();
  return {
    errors: responseJson.data.discountUpdate?.userErrors as UserError[],
  };
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
    collectionIds?: string[];
  },
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
                  id.includes("gid://") ? id : `gid://shopify/Collection/${id}`,
                ) || [],
            }),
          },
        ],
      },
    },
  });

  const responseJson = await response.json();
  return {
    errors: responseJson.data.discountUpdate?.userErrors as UserError[],
  };
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
    responseJson.data.discountNode.configurationField.value,
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

export async function getDiscountsFromDB() {
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
    description: discount.description,
  }));
}
