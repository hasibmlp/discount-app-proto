import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Button,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  IndexTable,
  Badge,
  useIndexResourceState,
  Link,
} from "@shopify/polaris";

import { getFunctions } from "../models/functions.server";
import { DeleteIcon } from "@shopify/polaris-icons";
import { getDiscountsFromDB } from "../models/discounts.server";
const resourceName = {
  singular: "discount",
  plural: "discounts",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const functions = await getFunctions(request);
  const discounts = await getDiscountsFromDB();
  return { functions, discounts };
};

export async function action() {}

export default function Index() {
  const { functions, discounts } = useLoaderData<typeof loader>();

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(discounts);

  const promotedBulkActions = [
    {
      content: "Activate discounts",
      onAction: () => console.log("Todo: implement activate discounts"),
    },
    {
      content: "Deactivate discounts",
      onAction: () => console.log("Todo: implement deactivate discounts"),
    },
  ];
  const bulkActions = [
    {
      icon: DeleteIcon,
      destructive: true,
      content: "Delete discounts",
      onAction: () => console.log("Todo: implement bulk delete"),
    },
  ];

  const rowMarkup = discounts.map(
    (
      { id, shopifyDiscountId, method, type, code, title, createdAt, status, used, description },
      index
    ) => (
      <IndexTable.Row
        id={id}
        key={id}
        selected={selectedResources.includes(id)}
        position={index}
      >
        <IndexTable.Cell>
          <Link
            dataPrimaryLink
            url={`/app/discount/${functions[0].id}/${shopifyDiscountId.replace('gid://shopify/DiscountCodeNode/', '')}`}
            removeUnderline
            monochrome
          >
            <BlockStack>
              <Text fontWeight="semibold" as="span">
                {method === 'CODE' ? code?.toUpperCase() : title}
              </Text>
              <Text as="span" variant="bodyMd">
                {description}
              </Text>
            </BlockStack>
          </Link>
        </IndexTable.Cell>
        <IndexTable.Cell>{status}</IndexTable.Cell>
        <IndexTable.Cell>{createdAt}</IndexTable.Cell>
        <IndexTable.Cell>
          {method === 'CODE' ? "Code" : "Automatic"}
        </IndexTable.Cell>
        <IndexTable.Cell>{type}</IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" variant="bodyMd" alignment="end" numeric>
            {used}
          </Text>
        </IndexTable.Cell>
      </IndexTable.Row>
    )
  );

  if (functions.length === 0) {
    return (
      <Page title="Discount Functions">
        <Layout>
          <Layout.Section>
            <Text as="p" variant="bodyMd">
              There is an issue with your app. Please contact support.
            </Text>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page
      title="Discount Functions"
      fullWidth
      primaryAction={{
        content: "Create discount",
        url: `/app/discount/${functions[0].id}/new`,
      }}
    >
      <Layout>
        <Layout.Section>
          <Card padding="0">
            <IndexTable
              resourceName={resourceName}
              itemCount={discounts.length}
              selectedItemsCount={
                allResourcesSelected ? "All" : selectedResources.length
              }
              bulkActions={bulkActions}
              promotedBulkActions={promotedBulkActions}
              onSelectionChange={handleSelectionChange}
              headings={[
                { title: "Method" },
                { title: "Status" },
                { title: "Date" },
                { title: "Method" },
                { title: "Type" },
                { title: "Used", alignment: "end" },
              ]}
              pagination={{
                hasNext: true,
                onNext: () => {},
              }}
            >
              {rowMarkup}
            </IndexTable>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
