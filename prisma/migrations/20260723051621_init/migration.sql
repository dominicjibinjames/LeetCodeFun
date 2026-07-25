-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "lastActive" TIMESTAMP(3),
    "geminiKeyEncrypted" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Problem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "leetcodeUrl" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "patternPrimary" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "businessUseCases" JSONB,
    "buildingSlot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Problem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "patternGuess" TEXT NOT NULL,
    "patternJustification" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "confidenceRating" INTEGER NOT NULL,
    "reasoningSeconds" INTEGER NOT NULL,
    "codingSeconds" INTEGER,
    "wasCorrectPattern" BOOLEAN,
    "wasBossFight" BOOLEAN NOT NULL DEFAULT false,
    "bossFightWon" BOOLEAN,
    "passedLeetCode" BOOLEAN,
    "mode" TEXT NOT NULL,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "box" INTEGER NOT NULL DEFAULT 1,
    "nextReviewDate" TIMESTAMP(3) NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'unattempted',
    "consecutiveMisses" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReviewState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Problem_userId_district_idx" ON "Problem"("userId", "district");

-- CreateIndex
CREATE UNIQUE INDEX "Problem_userId_buildingSlot_key" ON "Problem"("userId", "buildingSlot");

-- CreateIndex
CREATE INDEX "Attempt_userId_problemId_idx" ON "Attempt"("userId", "problemId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewState_problemId_key" ON "ReviewState"("problemId");

-- CreateIndex
CREATE INDEX "ReviewState_userId_nextReviewDate_idx" ON "ReviewState"("userId", "nextReviewDate");

-- CreateIndex
CREATE INDEX "ReviewState_userId_state_idx" ON "ReviewState"("userId", "state");

-- AddForeignKey
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewState" ADD CONSTRAINT "ReviewState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewState" ADD CONSTRAINT "ReviewState_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
