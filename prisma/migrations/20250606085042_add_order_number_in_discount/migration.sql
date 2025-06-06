/*
  Warnings:

  - You are about to drop the `TopDiscountedProduct` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `orderNumber` to the `DiscountUsage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DiscountUsage" ADD COLUMN     "orderNumber" TEXT NOT NULL;

-- DropTable
DROP TABLE "TopDiscountedProduct";
