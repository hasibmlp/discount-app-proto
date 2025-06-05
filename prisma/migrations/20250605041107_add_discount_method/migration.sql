/*
  Warnings:

  - Added the required column `discountMethod` to the `Discount` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DiscountMethod" AS ENUM ('CODE', 'AUTOMATIC');

-- AlterTable
ALTER TABLE "Discount" ADD COLUMN     "discountMethod" "DiscountMethod" NOT NULL;
