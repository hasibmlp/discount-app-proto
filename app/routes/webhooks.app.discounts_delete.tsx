import type { ActionFunctionArgs } from "@remix-run/node";

import { authenticate } from "../shopify.server";
import { deleteDiscountDB } from "../models/discounts.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  try {
    const result = await deleteDiscountDB(payload.admin_graphql_api_id);
    return new Response(JSON.stringify(result));
  } catch (e) {
    return { error: `Error processing webhook: ${e}`, status: 500 };
  }
};
