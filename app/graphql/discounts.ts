// Queries
export const GET_DISCOUNT = `
  query GetDiscount($id: ID!) {
    discountNode(id: $id) {
      id
      configurationField: metafield(
        namespace: "$app:example-discounts--ui-extension"
        key: "function-configuration"
      ) {
        id
        value
      }
      discount {
        __typename
        ... on DiscountAutomaticApp {
          title
          discountClasses
          combinesWith {
            orderDiscounts
            productDiscounts
            shippingDiscounts
          }
          startsAt
          endsAt
        }
        ... on DiscountCodeApp {
          title
          discountClasses
          combinesWith {
            orderDiscounts
            productDiscounts
            shippingDiscounts
          }
          startsAt
          endsAt
          usageLimit
          appliesOncePerCustomer
          codes(first: 1) {
            nodes {
              code
            }
          }
        }
      }
    }
  }
`;

export const GET_DISCOUNT_USAGE_COUNT = `
  query GetDiscountUsageCount($id: ID!) {
    discountNode(id: $id) {
      id
      usageCount
    }
  }
`;

// Mutations
export const UPDATE_CODE_DISCOUNT = `
  mutation UpdateCodeDiscount($id: ID!, $discount: DiscountCodeAppInput!) {
    discountUpdate: discountCodeAppUpdate(id: $id, codeAppDiscount: $discount) {
      userErrors {
        code
        message
        field
      }
    }
  }
`;

export const UPDATE_AUTOMATIC_DISCOUNT = `
  mutation UpdateAutomaticDiscount(
    $id: ID!
    $discount: DiscountAutomaticAppInput!
  ) {
    discountUpdate: discountAutomaticAppUpdate(
      id: $id
      automaticAppDiscount: $discount
    ) {
      userErrors {
        code
        message
        field
      }
    }
  }
`;

export const CREATE_CODE_DISCOUNT = `
  mutation CreateCodeDiscount($discount: DiscountCodeAppInput!) {
    discountCreate: discountCodeAppCreate(codeAppDiscount: $discount) {
      codeAppDiscount {
        discountId
        title
        discountClasses
        combinesWith {
          orderDiscounts
          productDiscounts
          shippingDiscounts
        }
        startsAt
        endsAt
        usageLimit
        appliesOncePerCustomer
        codes(first: 1) {
          nodes {
            code
          }
        }
      }
      userErrors {
        code
        message
        field
      }
    }
  }
`;

export const CREATE_AUTOMATIC_DISCOUNT = `
  mutation CreateAutomaticDiscount($discount: DiscountAutomaticAppInput!) {
    discountCreate: discountAutomaticAppCreate(
      automaticAppDiscount: $discount
    ) {
      automaticAppDiscount {
        discountId
      }
      userErrors {
        code
        message
        field
      }
    }
  }
`;

export const DELETE_AUTOMATIC_DISCOUNT = `
  mutation DeleteAutomaticDiscount($ids: [ID!]!) {
    discountAutomaticBulkDelete(ids: $ids) {
      job {
        id
      }
      userErrors {
        code
        field
        message
      }
    }
  }
`;

export const DELETE_CODE_DISCOUNT = `
  mutation DeleteCodeDiscount($ids: [ID!]!) {
    discountCodeBulkDelete(ids: $ids) {
      job {
        id
      }
      userErrors {
        code
        field
        message
      }
    }
  }
`;

export const DISCOUNT_AUTOMATIC_BULK_ACTIVATE = `
  mutation discountAutomaticBulkActivate($ids: [ID!]!) {
    discountAutomaticBulkActivate(ids: $ids) {
      job {
        id
      }
      userErrors {
        code
        field
        message
      }
    }
  }
`;

export const DISCOUNT_CODE_BULK_ACTIVATE = `
  mutation discountCodeBulkActivate($ids: [ID!]!) {
    discountCodeBulkActivate(ids: $ids) {
      job {
        id
      }
      userErrors {
        code
        field
        message
      }
    }
  }
`;

export const DISCOUNT_AUTOMATIC_BULK_DEACTIVATE = `
  mutation discountAutomaticBulkDeactivate($ids: [ID!]!) {
    discountAutomaticBulkDeactivate(ids: $ids) {
      job {
        id
      }
      userErrors {
        code
        field
        message
      }
    }
  }
`;

export const DISCOUNT_CODE_BULK_DEACTIVATE = `
  mutation discountCodeBulkDeactivate($ids: [ID!]!) {
    discountCodeBulkDeactivate(ids: $ids) {
      job {
        id
      }
      userErrors {
        code
        field
        message
      }
    }
  }
`;
