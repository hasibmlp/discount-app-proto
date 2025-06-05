/*
  Warnings:

  - You are about to drop the column `value` on the `Discount` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Discount" DROP COLUMN "value",
ADD COLUMN     "configuration" JSONB;
