-- CreateTable
CREATE TABLE "LeaveType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyAppId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LeaveAllocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyAppId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "daysAllocated" INTEGER NOT NULL,
    "carryForward" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyAppId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "leaveTypeKey" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "days" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "reviewer" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "LeaveType_companyAppId_idx" ON "LeaveType"("companyAppId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveType_companyAppId_key_key" ON "LeaveType"("companyAppId", "key");

-- CreateIndex
CREATE INDEX "LeaveAllocation_companyAppId_fiscalYear_idx" ON "LeaveAllocation"("companyAppId", "fiscalYear");

-- CreateIndex
CREATE INDEX "LeaveAllocation_walletAddress_idx" ON "LeaveAllocation"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveAllocation_companyAppId_walletAddress_fiscalYear_key" ON "LeaveAllocation"("companyAppId", "walletAddress", "fiscalYear");

-- CreateIndex
CREATE INDEX "LeaveRequest_companyAppId_status_createdAt_idx" ON "LeaveRequest"("companyAppId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "LeaveRequest_walletAddress_createdAt_idx" ON "LeaveRequest"("walletAddress", "createdAt");
