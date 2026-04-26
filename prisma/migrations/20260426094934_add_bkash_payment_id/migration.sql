/*
  Warnings:

  - A unique constraint covering the columns `[bkashPaymentId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "bkashPaymentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_bkashPaymentId_key" ON "Order"("bkashPaymentId");
