import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "~/db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, shop } = await authenticate.webhook(request);

  try {
    console.log("Received order_create webhook for shop:", shop);
    console.log("Order payload:", JSON.stringify(payload, null, 2));

    if (payload && Array.isArray(payload.discount_applications)) {
      console.log(
        "Found discount_applications:",
        payload.discount_applications
      );

      for (const application of payload.discount_applications) {
        let discountIdentifier: string | null = null;
        let discountTypeForLookup: "CODE" | "AUTOMATIC" | null = null;

        console.log("Processing discount application:", application);

        if (
          application.type === "automatic" &&
          typeof application.title === "string"
        ) {
          discountIdentifier = application.title;
          discountTypeForLookup = "AUTOMATIC";
        } else if (
          application.type === "discount_code" &&
          typeof application.code === "string"
        ) {
          discountIdentifier = application.code;
          discountTypeForLookup = "CODE";
        }

        console.log(
          `Discount identifier: ${discountIdentifier}, type: ${discountTypeForLookup}`
        );

        if (discountIdentifier && discountTypeForLookup) {
          const discountInDb = await prisma.discount.findUnique({
            where: {
              shop_name_unique_constraint: {
                shop: shop,
                name: discountIdentifier,
              },
            },
          });

          if (!discountInDb) {
            throw new Error(
              `Discount with identifier "${discountIdentifier}" not found in app DB for shop ${shop}.`
            );
          }

          // Update discount usage count
          await prisma.discount.update({
            where: { id: discountInDb?.id },
            data: {
              usedCount: { increment: 1 },
            },
          });

          // Process line items to track product usage
          if (Array.isArray(payload.line_items)) {
            for (const item of payload.line_items) {
              const productId = item.product_id?.toString();
              const productTitle = item.title;

              if (productId && productTitle) {
                // Create discount usage record
                await prisma.discountUsage.create({
                  data: {
                    shop,
                    discountId: discountInDb.id,
                    discountName: discountInDb.name,
                    productId,
                    productTitle,
                    orderId: payload.id.toString(),
                    orderNumber: payload.order_number.toString(),
                  },
                });
              }
            }
          }

          console.log(
            `Processed discount usage for discount (DB ID: ${discountInDb.id}, Shopify Code/Title: ${discountIdentifier})`
          );
        }
      }
    } else {
      console.log("No discount_applications found in payload.");
    }

    return new Response(JSON.stringify(payload));
  } catch (e) {
    console.error("Error processing order_create webhook:", e);
    return { error: `Error processing webhook: ${e}`, status: 500 };
  }
};
