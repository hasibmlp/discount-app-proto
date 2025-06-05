-- CreateEnum
CREATE TYPE "CombinesWith" AS ENUM ('ALL', 'ORDER_DISCOUNT', 'PRODUCT_DISCOUNT', 'SHIPPING_DISCOUNT');

-- AlterTable
ALTER TABLE "Discount" ADD COLUMN     "combinesWith" "CombinesWith" NOT NULL DEFAULT 'ALL';
