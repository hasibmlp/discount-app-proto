import { ActionFunctionArgs } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation, useNavigate } from "@remix-run/react";
import { Page } from "@shopify/polaris";

import { DiscountForm } from "../components/DiscountForm/DiscountForm";
import {
  createCodeDiscount,
  createAutomaticDiscount,
} from "../models/discounts.server";
import { DiscountMethod } from "../types/types";
import { authenticate } from "~/shopify.server";

export const loader = async () => {
  // Initially load with empty collections since none are selected yet
  return { collections: [] };
};

// [START build-the-ui.add-action]
export const action = async ({ params, request }: ActionFunctionArgs) => {
  const { redirect } = await authenticate.admin(request);
  const { functionId } = params;
  const formData = await request.formData();
  const discountData = formData.get("discount");
  if (!discountData || typeof discountData !== "string")
    throw new Error("No discount data provided");

  const {
    title,
    method,
    code,
    combinesWith,
    usageLimit,
    appliesOncePerCustomer,
    startsAt,
    endsAt,
    discountClasses,
    configuration,
  } = JSON.parse(discountData);

  const baseDiscount = {
    functionId,
    title,
    combinesWith,
    discountClasses,
    startsAt: new Date(startsAt),
    endsAt: endsAt && new Date(endsAt),
  };

  let result;

  if (method === DiscountMethod.Code) {
    result = await createCodeDiscount(
      request,
      baseDiscount,
      code,
      usageLimit,
      appliesOncePerCustomer,
      {
        cartLinePercentage: parseFloat(configuration.cartLinePercentage),
        orderPercentage: parseFloat(configuration.orderPercentage),
        deliveryPercentage: parseFloat(configuration.deliveryPercentage),
        cartLineFixedAmount: parseFloat(configuration.cartLineFixedAmount),
        orderFixedAmount: parseFloat(configuration.orderFixedAmount),
        deliveryFixedAmount: parseFloat(configuration.deliveryFixedAmount),
        collectionIds: configuration.collectionIds || [],
      },
    );
  } else {
    result = await createAutomaticDiscount(request, baseDiscount, {
      cartLinePercentage: parseFloat(configuration.cartLinePercentage),
      orderPercentage: parseFloat(configuration.orderPercentage),
      deliveryPercentage: parseFloat(configuration.deliveryPercentage),
      cartLineFixedAmount: parseFloat(configuration.cartLineFixedAmount),
      orderFixedAmount: parseFloat(configuration.orderFixedAmount),
      deliveryFixedAmount: parseFloat(configuration.deliveryFixedAmount),
      collectionIds: configuration.collectionIds || [],
    });
  }

  if (result.errors?.length > 0) {
    return { errors: result.errors };
  }

  return redirect("/app/discounts");
};
// [END build-the-ui.add-action]

interface ActionData {
  errors?: {
    code?: string;
    message: string;
    field: string[];
  }[];
  success?: boolean;
}

interface LoaderData {
  collections: { id: string; title: string }[];
}

export default function VolumeNew() {
  const actionData = useActionData<ActionData>();
  const { collections } = useLoaderData<LoaderData>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const isLoading = navigation.state === "submitting";
  const submitErrors = actionData?.errors || [];

  const initialData = {
    title: "",
    method: DiscountMethod.Code,
    code: "",
    discountClasses: [],
    combinesWith: {
      orderDiscounts: false,
      productDiscounts: false,
      shippingDiscounts: false,
    },
    usageLimit: null,
    appliesOncePerCustomer: false,
    startsAt: new Date(),
    endsAt: null,
    configuration: {
      cartLinePercentage: "0",
      orderPercentage: "0",
      deliveryPercentage: "0",
      collectionIds: [],
    },
  };

  return (
    <Page>
      <ui-title-bar title="Create product, order, and shipping discount">
        <button variant="breadcrumb" onClick={() => navigate("/app/discounts")}>
          Discounts
        </button>
      </ui-title-bar>

      <DiscountForm
        initialData={initialData}
        collections={collections}
        isLoading={isLoading}
        submitErrors={submitErrors}
        success={actionData?.success}
      />
    </Page>
  );
}
