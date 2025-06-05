-- CreateEnum
CREATE TYPE "DiscountClass" AS ENUM ('ORDER', 'PRODUCT', 'SHIPPING');

-- AlterTable
ALTER TABLE "Discount" ADD COLUMN     "discountClasses" "DiscountClass"[];
