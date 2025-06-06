export const GET_PRODUCTS = `
  query GetProducts($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id
        title
        featuredImage {
          url
        }
      }
    }
  }
`;

export const GET_TOP_DISCOUNTED_PRODUCTS = `
  query GetOrdersWithDiscounts($query: String!) {
    orders(first: 250, query: $query) {
      edges {
        node {
          id
          lineItems(first: 50) {
            edges {
              node {
                product {
                  id
                  title
                  featuredImage {
                    url
                  }
                }
              }
            }
          }
          discountApplications(first: 10) {
            edges {
              node {
                ... on DiscountCodeApplication {
                  code
                  value
                }
                ... on AutomaticDiscountApplication {
                  title
                  value
                }
              }
            }
          }
        }
      }
    }
  }
`;
