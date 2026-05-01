-- CreateEnum
CREATE TYPE "WorldNewsCategory" AS ENUM ('TOURNAMENT_RESULT', 'TRANSFER', 'ROSTER_CHANGE', 'ANNOUNCEMENT', 'GENERAL');

-- CreateTable
CREATE TABLE "WorldNews" (
    "id" TEXT NOT NULL,
    "game" "Game",
    "category" "WorldNewsCategory" NOT NULL DEFAULT 'GENERAL',
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "body" TEXT NOT NULL,
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "imageUrl" TEXT,
    "originalLang" TEXT NOT NULL DEFAULT 'en',
    "translations" JSONB,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldNews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorldNews_game_publishedAt_idx" ON "WorldNews"("game", "publishedAt");

-- CreateIndex
CREATE INDEX "WorldNews_category_publishedAt_idx" ON "WorldNews"("category", "publishedAt");
