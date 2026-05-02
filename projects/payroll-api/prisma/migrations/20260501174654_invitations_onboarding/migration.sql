-- AlterTable
ALTER TABLE "EmployeeMeta" ADD COLUMN "email" TEXT;

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyAppId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "acceptedAt" DATETIME,
    "employeeWalletAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OnboardingChecklistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyAppId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EmployeeOnboardingStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyAppId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_codeHash_key" ON "Invitation"("codeHash");

-- CreateIndex
CREATE INDEX "Invitation_companyAppId_createdAt_idx" ON "Invitation"("companyAppId", "createdAt");

-- CreateIndex
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");

-- CreateIndex
CREATE INDEX "OnboardingChecklistItem_companyAppId_sortOrder_idx" ON "OnboardingChecklistItem"("companyAppId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingChecklistItem_companyAppId_key_key" ON "OnboardingChecklistItem"("companyAppId", "key");

-- CreateIndex
CREATE INDEX "EmployeeOnboardingStatus_companyAppId_walletAddress_idx" ON "EmployeeOnboardingStatus"("companyAppId", "walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeOnboardingStatus_companyAppId_walletAddress_itemKey_key" ON "EmployeeOnboardingStatus"("companyAppId", "walletAddress", "itemKey");
