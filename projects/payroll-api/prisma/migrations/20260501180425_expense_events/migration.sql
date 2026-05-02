-- CreateTable
CREATE TABLE "ExpenseEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyAppId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amountUsdcMicrounits" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ExpenseEvent_companyAppId_createdAt_idx" ON "ExpenseEvent"("companyAppId", "createdAt");

-- CreateIndex
CREATE INDEX "ExpenseEvent_type_idx" ON "ExpenseEvent"("type");
