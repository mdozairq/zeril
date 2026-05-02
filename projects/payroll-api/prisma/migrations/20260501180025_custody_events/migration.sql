-- CreateTable
CREATE TABLE "CustodyEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyAppId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amountUsdcMicrounits" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "CustodyEvent_idempotencyKey_key" ON "CustodyEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "CustodyEvent_companyAppId_createdAt_idx" ON "CustodyEvent"("companyAppId", "createdAt");

-- CreateIndex
CREATE INDEX "CustodyEvent_type_idx" ON "CustodyEvent"("type");
