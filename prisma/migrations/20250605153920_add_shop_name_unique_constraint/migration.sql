/*
  Warnings:

  - You are about to drop the column `description` on the `Discount` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[shop,name]` on the table `Discount` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Discount" DROP COLUMN "description";

-- CreateIndex
CREATE UNIQUE INDEX "Discount_shop_name_key" ON "Discount"("shop", "name");
