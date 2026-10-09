-- AlterTable
ALTER TABLE "User" ADD COLUMN "smsOptOut" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "trackedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CartSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "items" JSONB NOT NULL DEFAULT '[]',
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "value" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remindedAt" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "reminderCoupon" TEXT,
    "recoveredOrderId" TEXT,
    "recoveredAt" TIMESTAMP(3),

    CONSTRAINT "CartSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "audience" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sending',
    "recipients" INTEGER NOT NULL DEFAULT 0,
    "sent" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "smsParts" INTEGER NOT NULL DEFAULT 1,
    "error" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "SmsCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "fbCapiToken" TEXT NOT NULL DEFAULT '',
    "fbTestCode" TEXT NOT NULL DEFAULT '',
    "feedEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CartSnapshot_userId_key" ON "CartSnapshot"("userId");
CREATE INDEX "CartSnapshot_updatedAt_idx" ON "CartSnapshot"("updatedAt");
CREATE INDEX "CartSnapshot_remindedAt_idx" ON "CartSnapshot"("remindedAt");
CREATE INDEX "SmsCampaign_createdAt_idx" ON "SmsCampaign"("createdAt");

-- CreateTable
CREATE TABLE "CartReminderSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "auto" BOOLEAN NOT NULL DEFAULT false,
    "afterHours" INTEGER NOT NULL DEFAULT 3,
    "couponCode" TEXT NOT NULL DEFAULT '',
    "template" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartReminderSettings_pkey" PRIMARY KEY ("id")
);
