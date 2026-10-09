-- Human order numbers (EB-10001…), numbered by placement time.
CREATE SEQUENCE "Order_number_seq" START 10001;
ALTER TABLE "Order" ADD COLUMN "number" INTEGER;
UPDATE "Order" o SET "number" = s.n
  FROM (SELECT "id", 10000 + row_number() OVER (ORDER BY "createdAt", "id") AS n FROM "Order") s
  WHERE s."id" = o."id";
SELECT setval('"Order_number_seq"', COALESCE((SELECT max("number") FROM "Order"), 10000));
ALTER TABLE "Order" ALTER COLUMN "number" SET DEFAULT nextval('"Order_number_seq"');
ALTER TABLE "Order" ALTER COLUMN "number" SET NOT NULL;
ALTER SEQUENCE "Order_number_seq" OWNED BY "Order"."number";
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");

-- Storefront settings
ALTER TABLE "SiteSettings" ADD COLUMN "supportHours" TEXT NOT NULL DEFAULT '',
ADD COLUMN "tawkId" TEXT NOT NULL DEFAULT '',
ADD COLUMN "newsletterCoupon" TEXT NOT NULL DEFAULT '',
ADD COLUMN "flashSaleEndsAt" TIMESTAMP(3);

-- The chat that was hard-coded keeps working until changed in Settings.
UPDATE "SiteSettings" SET "tawkId" = '6a00d6da11568a1c34746620/1jo9kei7h' WHERE "id" = 'default';
INSERT INTO "SiteSettings" ("id", "tawkId", "updatedAt")
  SELECT 'default', '6a00d6da11568a1c34746620/1jo9kei7h', CURRENT_TIMESTAMP
  WHERE NOT EXISTS (SELECT 1 FROM "SiteSettings" WHERE "id" = 'default');

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "orderRef" TEXT NOT NULL DEFAULT '',
    "message" TEXT NOT NULL,
    "userId" TEXT,
    "ip" TEXT,
    "handledAt" TIMESTAMP(3),
    "handledBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContactMessage_createdAt_idx" ON "ContactMessage"("createdAt");
CREATE INDEX "ContactMessage_handledAt_idx" ON "ContactMessage"("handledAt");
