import { LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import {
  Page,
  Card,
  BlockStack,
  Text,
  ResourceList,
  ResourceItem,
  Thumbnail,
  InlineStack,
  Badge,
  Button,
} from "@shopify/polaris";
import {
  getDiscountUsage,
  getTopDiscountedProducts,
} from "~/models/discounts.server";
import { getProductsByIds } from "~/models/products.server";
import { navigateToProduct } from "~/utils/navigation";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const topProducts = await getTopDiscountedProducts(request);
  const activityData = await getDiscountUsage(request);

  return { topProducts, activityData };
};
export default function Dashboard() {
  const { topProducts, activityData } = useLoaderData<typeof loader>();

  const resourceName = {
    singular: "product",
    plural: "products",
  };

  if (!topProducts.length && !activityData.length) {
    return (
      <Page title="Dashboard" subtitle="View your dashboard">
        <BlockStack gap="800">
          <Card>
            <BlockStack gap="400" align="center">
              <Text as="h2" variant="headingMd" alignment="center">
                Welcome to Discounts Dashboard
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                Data will be available once discounts are used.
              </Text>
              <InlineStack gap="400" align="center">
                <Button url="/app/discounts" variant="primary" size="large">
                  Go to discounts
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </BlockStack>
      </Page>
    );
  }

  return (
    <Page title="Dashboard" subtitle="View your dashboard">
      <BlockStack gap="400">
        {/* Top Products Section */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <Text as="h2" variant="headingMd">
                Top Products with Discounts
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Last 30 days
              </Text>
            </InlineStack>
            <ResourceList
              resourceName={resourceName}
              items={topProducts}
              renderItem={(item) => (
                <ResourceItem
                  id={item.productId}
                  media={
                    <Thumbnail
                      source={item.featuredImage}
                      alt={item.productTitle}
                      size="small"
                    />
                  }
                  accessibilityLabel={`View details for ${item.productTitle}`}
                  onClick={() => {
                    navigateToProduct(item.productId);
                  }}
                >
                  <BlockStack>
                    <Text as="span" variant="bodyMd" fontWeight="semibold">
                      {item.productTitle}
                    </Text>
                  </BlockStack>
                </ResourceItem>
              )}
            />
          </BlockStack>
        </Card>

        {/* Activity Section */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Activity
            </Text>
            <ResourceList
              resourceName={{ singular: "activity", plural: "activities" }}
              items={activityData}
              renderItem={(item) => (
                <ResourceItem id={item.id} onClick={() => {}}>
                  <InlineStack
                    gap="400"
                    align="space-between"
                    blockAlign="center"
                  >
                    <BlockStack gap="0">
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        {item.productTitle}
                      </Text>
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="span" variant="bodySm" tone="subdued">
                          Order: {item.orderNumber}
                        </Text>
                        <Text as="span" variant="bodySm" tone="subdued">
                          {item.createdAt}
                        </Text>
                      </InlineStack>
                    </BlockStack>
                    <InlineStack gap="200" blockAlign="center">
                      <Badge tone="success">{item.discountName}</Badge>
                    </InlineStack>
                  </InlineStack>
                </ResourceItem>
              )}
            />
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
