/*
  Warnings:

  - You are about to drop the column `discountCode` on the `DiscountUsage` table. All the data in the column will be lost.
  - Added the required column `discountName` to the `DiscountUsage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shop` to the `DiscountUsage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DiscountUsage" DROP COLUMN "discountCode",
ADD COLUMN     "discountName" TEXT NOT NULL,
ADD COLUMN     "shop" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "TopDiscountedProduct" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopDiscountedProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TopDiscountedProduct_shop_idx" ON "TopDiscountedProduct"("shop");

-- CreateIndex
CREATE INDEX "TopDiscountedProduct_productId_idx" ON "TopDiscountedProduct"("productId");

-- CreateIndex
CREATE INDEX "DiscountUsage_shop_idx" ON "DiscountUsage"("shop");
