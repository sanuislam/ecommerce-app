-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "upayTxnId" TEXT;

-- AlterTable
ALTER TABLE "PaymentSettings" ADD COLUMN     "upayBaseUrl" TEXT NOT NULL DEFAULT 'https://uat-pg.upay.systems',
ADD COLUMN     "upayEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "upayMerchantCity" TEXT NOT NULL DEFAULT 'Dhaka',
ADD COLUMN     "upayMerchantCode" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "upayMerchantId" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "upayMerchantKey" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "upayMerchantMobile" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "upayMerchantName" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "Order_upayTxnId_key" ON "Order"("upayTxnId");
