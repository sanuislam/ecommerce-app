-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "flashDeal" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Product_flashDeal_idx" ON "Product"("flashDeal");
