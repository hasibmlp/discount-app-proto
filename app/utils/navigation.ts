export function returnToDiscounts() {
  if (typeof window !== "undefined") {
    window.open("shopify://admin/discounts", "_top");
  }
}

export function navigateToProduct(productId: string) {
  if (typeof window !== "undefined") {
    window.open(`shopify://admin/products/${productId}`, "_top");
  }
}
