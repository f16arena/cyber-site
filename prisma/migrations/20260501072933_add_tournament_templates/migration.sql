-- CreateTable
CREATE TABLE "TournamentTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "game" "Game" NOT NULL,
    "format" "TournamentFormat" NOT NULL,
    "prize" BIGINT NOT NULL DEFAULT 0,
    "maxTeams" INTEGER NOT NULL DEFAULT 8,
    "description" TEXT,
    "rules" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TournamentTemplate_game_idx" ON "TournamentTemplate"("game");
