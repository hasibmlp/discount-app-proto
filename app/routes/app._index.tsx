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
} from "@shopify/polaris";

import { getFunctions } from "../models/functions.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const functions = await getFunctions(request);
  return { functions };
};

export async function action() {}

export default function Index() {
  const { functions } = useLoaderData<typeof loader>();

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
    <Page title="Discount Functions">
      <Layout>
        <Layout.Section></Layout.Section>

        <Layout.Section>
          <BlockStack gap="400">
            {functions.map((item) => (
              <Card key={item.id}>
                <InlineStack align="space-between">
                  <Text as="span" variant="bodyMd" fontWeight="bold">
                    {item.title}
                  </Text>
                  <Button
                    variant="primary"
                    url={`/app/discount/${item.id}/new`}
                  >
                    Create discount
                  </Button>
                </InlineStack>
              </Card>
            ))}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
