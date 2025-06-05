/*
  Warnings:

  - A unique constraint covering the columns `[shopifyDiscountId]` on the table `Discount` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `shopifyDiscountId` to the `Discount` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Discount" ADD COLUMN     "shopifyDiscountId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Discount_shopifyDiscountId_key" ON "Discount"("shopifyDiscountId");
