-- CreateTable
CREATE TABLE "OfframpRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyAppId" TEXT NOT NULL,
    "employeeWalletAddress" TEXT NOT NULL,
    "amountUsdcMicrounits" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'created',
    "provider" TEXT NOT NULL DEFAULT 'wormhole+saber',
    "idempotencyKey" TEXT NOT NULL,
    "bridgeRef" TEXT,
    "offrampRef" TEXT,
    "retries" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "OfframpRequest_idempotencyKey_key" ON "OfframpRequest"("idempotencyKey");

-- CreateIndex
CREATE INDEX "OfframpRequest_companyAppId_createdAt_idx" ON "OfframpRequest"("companyAppId", "createdAt");

-- CreateIndex
CREATE INDEX "OfframpRequest_employeeWalletAddress_createdAt_idx" ON "OfframpRequest"("employeeWalletAddress", "createdAt");

-- CreateIndex
CREATE INDEX "OfframpRequest_status_idx" ON "OfframpRequest"("status");
