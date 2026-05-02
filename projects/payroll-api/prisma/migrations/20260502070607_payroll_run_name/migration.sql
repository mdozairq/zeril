-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PayrollRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyAppId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "totalAmount" TEXT NOT NULL DEFAULT '0',
    "employeesPaid" INTEGER NOT NULL DEFAULT 0,
    "employeesFailed" INTEGER NOT NULL DEFAULT 0,
    "algoRate" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PayrollRun_companyAppId_fkey" FOREIGN KEY ("companyAppId") REFERENCES "Company" ("appId") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PayrollRun" ("algoRate", "companyAppId", "createdAt", "employeesFailed", "employeesPaid", "id", "status", "totalAmount") SELECT "algoRate", "companyAppId", "createdAt", "employeesFailed", "employeesPaid", "id", "status", "totalAmount" FROM "PayrollRun";
DROP TABLE "PayrollRun";
ALTER TABLE "new_PayrollRun" RENAME TO "PayrollRun";
CREATE INDEX "PayrollRun_companyAppId_createdAt_idx" ON "PayrollRun"("companyAppId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
