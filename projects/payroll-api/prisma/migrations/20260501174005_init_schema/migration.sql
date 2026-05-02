-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "treasuryAsset" TEXT NOT NULL DEFAULT 'USDC',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EmployeeMeta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyAppId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "network" TEXT NOT NULL DEFAULT 'algorand',
    "settlementType" TEXT NOT NULL DEFAULT 'crypto',
    "country" TEXT,
    "kycStatus" TEXT NOT NULL DEFAULT 'pending',
    "bankDetails" TEXT,
    "payoutMethod" TEXT,
    "cryptoAddress" TEXT,
    "cryptoNetwork" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmployeeMeta_companyAppId_fkey" FOREIGN KEY ("companyAppId") REFERENCES "Company" ("appId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KycCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyAppId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "nationality" TEXT,
    "submittedAt" DATETIME,
    "reviewedAt" DATETIME,
    "reviewer" TEXT,
    "rejectionNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "KycCase_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeMeta" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KycDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "country" TEXT,
    "issuedAt" DATETIME,
    "expiresAt" DATETIME,
    "reference" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KycDocument_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "KycCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ComplianceDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "contentMd" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyAppId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorAddress" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_companyAppId_fkey" FOREIGN KEY ("companyAppId") REFERENCES "Company" ("appId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyAppId" TEXT NOT NULL,
    "totalAmount" TEXT NOT NULL,
    "employeesPaid" INTEGER NOT NULL,
    "employeesFailed" INTEGER NOT NULL DEFAULT 0,
    "algoRate" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PayrollRun_companyAppId_fkey" FOREIGN KEY ("companyAppId") REFERENCES "Company" ("appId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_appId_key" ON "Company"("appId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeMeta_companyAppId_walletAddress_key" ON "EmployeeMeta"("companyAppId", "walletAddress");

-- CreateIndex
CREATE INDEX "KycCase_companyAppId_status_idx" ON "KycCase"("companyAppId", "status");

-- CreateIndex
CREATE INDEX "KycCase_employeeId_createdAt_idx" ON "KycCase"("employeeId", "createdAt");

-- CreateIndex
CREATE INDEX "KycDocument_caseId_idx" ON "KycDocument"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "KycDocument_caseId_sha256_key" ON "KycDocument"("caseId", "sha256");

-- CreateIndex
CREATE INDEX "ComplianceDocument_key_isActive_idx" ON "ComplianceDocument"("key", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceDocument_key_version_key" ON "ComplianceDocument"("key", "version");

-- CreateIndex
CREATE INDEX "AuditLog_companyAppId_createdAt_idx" ON "AuditLog"("companyAppId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "PayrollRun_companyAppId_createdAt_idx" ON "PayrollRun"("companyAppId", "createdAt");
