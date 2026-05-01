-- AlterTable
ALTER TABLE "User" ADD COLUMN "faceitNickname" TEXT,
ADD COLUMN "faceitId" TEXT,
ADD COLUMN "dotaAccountId" TEXT,
ADD COLUMN "pubgNickname" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_faceitNickname_key" ON "User"("faceitNickname");
