/*
  Warnings:

  - A unique constraint covering the columns `[shop,productId]` on the table `TopDiscountedProduct` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "TopDiscountedProduct_shop_productId_key" ON "TopDiscountedProduct"("shop", "productId");
