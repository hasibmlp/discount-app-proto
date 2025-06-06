import { GET_PRODUCTS } from "../graphql/products";
import { authenticate } from "../shopify.server";

interface Product {
  id: string;
  title: string;
  featuredImage: {
    url: string;
  };
}

export async function getProductsByIds(request: Request, ids: string[]) {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(GET_PRODUCTS, {
    variables: {
      ids: ids.map((id: string) =>
        id.includes("gid://") ? id : `gid://shopify/Product/${id}`
      ),
    },
  });

  const { data } = await response.json();
  return data.nodes.filter(Boolean) as Product[];
}
