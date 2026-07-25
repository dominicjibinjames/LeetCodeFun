-- AlterTable
ALTER TABLE "ReviewState" ADD COLUMN     "fireSince" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "journeyStartedAt" TIMESTAMP(3),
ADD COLUMN     "progressiveUnlock" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "DailyConquest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "estDay" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "buildingSlot" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyConquest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyConquest_userId_estDay_idx" ON "DailyConquest"("userId", "estDay");

-- CreateIndex
CREATE UNIQUE INDEX "DailyConquest_userId_estDay_problemId_key" ON "DailyConquest"("userId", "estDay", "problemId");

-- AddForeignKey
ALTER TABLE "DailyConquest" ADD CONSTRAINT "DailyConquest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyConquest" ADD CONSTRAINT "DailyConquest_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
