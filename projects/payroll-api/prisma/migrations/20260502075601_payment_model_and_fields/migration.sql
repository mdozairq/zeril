-- AlterTable
ALTER TABLE "EmployeeMeta" ADD COLUMN "bankDetailsJson" TEXT;

-- AlterTable
ALTER TABLE "KycDocument" ADD COLUMN "fileUrl" TEXT;
ALTER TABLE "KycDocument" ADD COLUMN "pinataCid" TEXT;

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "payrollRunId" TEXT NOT NULL,
    "employeeAddress" TEXT NOT NULL,
    "grossAmount" TEXT NOT NULL,
    "taxWithheld" TEXT NOT NULL DEFAULT '0',
    "netAmount" TEXT NOT NULL,
    "countryCode" TEXT,
    "tdsAmount" TEXT,
    "socialSecurity" TEXT,
    "surcharge" TEXT,
    "effectiveRate" TEXT,
    "txHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Payment_payrollRunId_idx" ON "Payment"("payrollRunId");

-- CreateIndex
CREATE INDEX "Payment_employeeAddress_createdAt_idx" ON "Payment"("employeeAddress", "createdAt");
