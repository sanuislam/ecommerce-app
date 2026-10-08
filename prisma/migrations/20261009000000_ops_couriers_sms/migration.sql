-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'web',
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "courierConsignmentId" TEXT,
ADD COLUMN     "courierStatus" TEXT,
ADD COLUMN     "courierUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "courierCharge" DECIMAL(10,2);

-- CreateIndex
CREATE INDEX "Order_courier_courierConsignmentId_idx" ON "Order"("courier", "courierConsignmentId");

-- CreateTable
CREATE TABLE "CourierSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "webhookKey" TEXT NOT NULL DEFAULT '',
    "defaultWeightKg" DECIMAL(5,2) NOT NULL DEFAULT 0.5,
    "steadfastEnabled" BOOLEAN NOT NULL DEFAULT false,
    "steadfastApiKey" TEXT NOT NULL DEFAULT '',
    "steadfastSecretKey" TEXT NOT NULL DEFAULT '',
    "steadfastWebhookToken" TEXT NOT NULL DEFAULT '',
    "pathaoEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pathaoMode" TEXT NOT NULL DEFAULT 'sandbox',
    "pathaoClientId" TEXT NOT NULL DEFAULT '',
    "pathaoClientSecret" TEXT NOT NULL DEFAULT '',
    "pathaoUsername" TEXT NOT NULL DEFAULT '',
    "pathaoPassword" TEXT NOT NULL DEFAULT '',
    "pathaoStoreId" INTEGER,
    "pathaoWebhookSecret" TEXT NOT NULL DEFAULT '',
    "pathaoAccessToken" TEXT NOT NULL DEFAULT '',
    "pathaoRefreshToken" TEXT NOT NULL DEFAULT '',
    "pathaoTokenExpiresAt" TIMESTAMP(3),
    "redxEnabled" BOOLEAN NOT NULL DEFAULT false,
    "redxMode" TEXT NOT NULL DEFAULT 'sandbox',
    "redxToken" TEXT NOT NULL DEFAULT '',
    "redxPickupStoreId" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourierSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "apiKey" TEXT NOT NULL DEFAULT '',
    "senderId" TEXT NOT NULL DEFAULT '',
    "onPlaced" BOOLEAN NOT NULL DEFAULT true,
    "onConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "onShipped" BOOLEAN NOT NULL DEFAULT true,
    "onDelivered" BOOLEAN NOT NULL DEFAULT true,
    "onCancelled" BOOLEAN NOT NULL DEFAULT true,
    "tplPlaced" TEXT NOT NULL DEFAULT '',
    "tplConfirmed" TEXT NOT NULL DEFAULT '',
    "tplShipped" TEXT NOT NULL DEFAULT '',
    "tplDelivered" TEXT NOT NULL DEFAULT '',
    "tplCancelled" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsLog" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "event" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sending',
    "error" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmsLog_createdAt_idx" ON "SmsLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SmsLog_orderId_event_key" ON "SmsLog"("orderId", "event");
