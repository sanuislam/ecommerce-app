-- CreateTable
CREATE TABLE "PaymentSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "bkashEnabled" BOOLEAN NOT NULL DEFAULT false,
    "bkashMode" TEXT NOT NULL DEFAULT 'sandbox',
    "bkashUsername" TEXT NOT NULL DEFAULT '',
    "bkashPassword" TEXT NOT NULL DEFAULT '',
    "bkashAppKey" TEXT NOT NULL DEFAULT '',
    "bkashAppSecret" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentSettings_pkey" PRIMARY KEY ("id")
);
