import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Card,
  BlockStack,
  Text,
  Select,
  DataTable,
  Badge,
} from "@shopify/polaris";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useState, useCallback } from "react";
import prisma from "~/db.server";

interface Discount {
  id: string;
  name: string;
  code: string;
  usedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface WeeklyData {
  week: string;
  totalUsage: number;
  discounts: Array<{
    name: string;
    code: string;
    usage: number;
  }>;
}

export const loader = async ({ request }: { request: Request }) => {
  const discounts = await prisma.discount.findMany({
    select: {
      id: true,
      name: true,
      code: true,
      usedCount: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Group usage data by week
  const weeklyData = discounts.reduce(
    (acc: Record<string, WeeklyData>, discount: Discount) => {
      const week = new Date(discount.createdAt);
      week.setHours(0, 0, 0, 0);
      week.setDate(week.getDate() - week.getDay()); // Start of week (Sunday)

      const weekKey = week.toISOString().split("T")[0];
      if (!acc[weekKey]) {
        acc[weekKey] = {
          week: weekKey,
          totalUsage: 0,
          discounts: [],
        };
      }
      acc[weekKey].totalUsage += discount.usedCount;
      acc[weekKey].discounts.push({
        name: discount.name,
        code: discount.code,
        usage: discount.usedCount,
      });
      return acc;
    },
    {}
  );

  // Convert to array and sort by week
  const weeklyDataArray = Object.values(weeklyData).sort((a, b) => {
    const dateA = new Date((a as WeeklyData).week);
    const dateB = new Date((b as WeeklyData).week);
    return dateA.getTime() - dateB.getTime();
  });

  return json({ weeklyData: weeklyDataArray });
};

export default function UsageReport() {
  const { weeklyData } = useLoaderData<typeof loader>();
  const [timeRange, setTimeRange] = useState("4");

  const handleTimeRangeChange = useCallback(
    (value: string) => setTimeRange(value),
    []
  );

  // Filter data based on selected time range
  const filteredData = weeklyData.slice(-parseInt(timeRange));

  // Prepare data for DataTable
  const rows = weeklyData.map((week) => {
    const typedWeek = week as WeeklyData;
    return [
      new Date(typedWeek.week).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      typedWeek.totalUsage.toString(),
      typedWeek.discounts.map((discount) => (
        <div key={discount.code}>
          <Text variant="bodyMd" as="span">
            {discount.name}
          </Text>
          <Badge tone="info" size="small">
            {discount.code}
          </Badge>
          <Text variant="bodyMd" as="span" fontWeight="bold">
            {" "}
            {discount.usage}
          </Text>
        </div>
      )),
    ];
  });

  return (
    <Page
      title="Usage Report"
      subtitle="Track your discount usage over time"
    >
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="400">
            <Select
              label="Time Range"
              options={[
                { label: "Last 4 weeks", value: "4" },
                { label: "Last 8 weeks", value: "8" },
                { label: "Last 12 weeks", value: "12" },
              ]}
              value={timeRange}
              onChange={handleTimeRangeChange}
            />
            <div style={{ height: "400px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="week"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });
                    }}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalUsage"
                    stroke="#8884d8"
                    name="Total Usage"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h2">
              Weekly Usage Details
            </Text>
            <DataTable
              columnContentTypes={["text", "numeric", "text"]}
              headings={["Week", "Total Usage", "Discounts Used"]}
              rows={rows}
              totals={["", "", ""]}
            />
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
