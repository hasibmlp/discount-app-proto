import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  IndexTable,
  Badge,
  useIndexResourceState,
  Link,
} from "@shopify/polaris";
import { json, redirect } from "@remix-run/node";

import { getFunctions } from "../models/functions.server";
import { DeleteIcon } from "@shopify/polaris-icons";
import {
  getDiscounts,
  deleteDiscountBulk,
  updateDiscountStatusBulk,
} from "../models/discounts.server";
import { getDiscountDescription } from "~/utils/discount";
const resourceName = {
  singular: "discount",
  plural: "discounts",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const functions = await getFunctions(request);
  const discounts = await getDiscounts();
  return { functions, discounts };
};

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const action = formData.get("action") as string;
  const shopifyIds = formData.getAll("ids") as string[];

  let result;

  switch (action) {
    case "delete":
      result = await deleteDiscountBulk(request, shopifyIds);
      break;
    case "activate":
      result = await updateDiscountStatusBulk(request, shopifyIds, "activate");
      break;
    case "deactivate":
      result = await updateDiscountStatusBulk(
        request,
        shopifyIds,
        "deactivate"
      );
      break;
    default:
      return json({ error: "Invalid action" }, { status: 400 });
  }

  if (!result.success) {
    return json({ error: result.error }, { status: 400 });
  }

  return redirect("/app/discounts");
}

export default function Index() {
  const { functions, discounts } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(discounts);

  const handleBulkAction = (action: string) => {
    const formData = new FormData();
    formData.append("action", action);

    const selectedDiscounts = discounts.filter((discount) =>
      selectedResources.includes(discount.id)
    );

    selectedDiscounts.forEach((discount) => {
      if (discount.shopifyDiscountId) {
        formData.append("ids", discount.shopifyDiscountId);
      }
    });

    submit(formData, { method: "post" });
  };

  const promotedBulkActions = [
    {
      content: "Activate discounts",
      onAction: () => handleBulkAction("activate"),
      disabled: isSubmitting || selectedResources.length === 0,
    },
    {
      content: "Deactivate discounts",
      onAction: () => handleBulkAction("deactivate"),
      disabled: isSubmitting || selectedResources.length === 0,
    },
  ];

  const bulkActions = [
    {
      icon: DeleteIcon,
      destructive: true,
      content: "Delete discounts",
      onAction: () => handleBulkAction("delete"),
      disabled: isSubmitting || selectedResources.length === 0,
    },
  ];

  const rowMarkup = discounts.map(
    (
      {
        id,
        shopifyDiscountId,
        method,
        type,
        code,
        title,
        createdAt,
        status,
        used,
        usageLimit,
        startsAt,
        endsAt,
        configuration,
      },
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
            url={`/app/discount/${functions[0].id}/${shopifyDiscountId.replace("gid://shopify/DiscountCodeNode/", "")}`}
            removeUnderline
            monochrome
          >
            <BlockStack>
              <Text fontWeight="semibold" as="span">
                {method === "CODE" ? code?.toUpperCase() : title}
              </Text>
              <Text as="span" variant="bodyMd">
                {getDiscountDescription({
                  type,
                  code,
                  method,
                  usageLimit,
                  configuration,
                })}
              </Text>
            </BlockStack>
          </Link>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Badge tone={status === "ACTIVE" ? "success" : "enabled"}>
            {status}
          </Badge>
        </IndexTable.Cell>
        <IndexTable.Cell>{createdAt}</IndexTable.Cell>
        <IndexTable.Cell>
          {method === "CODE" ? "Code" : "Automatic"}
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
      <Page title="Discounts" fullWidth>
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
      title="Discounts"
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
            >
              {rowMarkup}
            </IndexTable>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

