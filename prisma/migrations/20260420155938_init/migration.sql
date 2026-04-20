-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "format" TEXT NOT NULL DEFAULT 'single',
    "winnerId" TEXT NOT NULL,
    "loserId" TEXT NOT NULL,
    "winnerScore" INTEGER,
    "loserScore" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Match_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_loserId_fkey" FOREIGN KEY ("loserId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerRating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "rating" REAL NOT NULL DEFAULT 1500,
    "rd" REAL NOT NULL DEFAULT 350,
    "volatility" REAL NOT NULL DEFAULT 0.06,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlayerRating_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RatingHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "matchId" TEXT,
    "ratingBefore" REAL NOT NULL,
    "rdBefore" REAL NOT NULL,
    "ratingAfter" REAL NOT NULL,
    "rdAfter" REAL NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RatingHistory_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RatingHistory_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_name_key" ON "Player"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerRating_playerId_key" ON "PlayerRating"("playerId");
