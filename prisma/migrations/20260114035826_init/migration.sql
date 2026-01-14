-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "defaultPlatforms" TEXT NOT NULL DEFAULT '[]',
    "defaultRegion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'IGDB',
    "providerGameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "bannerUrl" TEXT,
    "firstReleaseDate" TIMESTAMP(3),
    "genres" TEXT NOT NULL DEFAULT '[]',
    "platforms" TEXT NOT NULL DEFAULT '[]',
    "franchises" TEXT NOT NULL DEFAULT '[]',
    "themes" TEXT NOT NULL DEFAULT '[]',
    "gameModes" TEXT NOT NULL DEFAULT '[]',
    "playerCount" TEXT,
    "videos" TEXT NOT NULL DEFAULT '[]',
    "rating" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGameEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "groupId" TEXT,
    "status" TEXT NOT NULL,
    "platform" TEXT,
    "rating" INTEGER,
    "notes" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGameEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupInterestProfile" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signals" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupInterestProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupRecommendation" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "recommendationType" TEXT NOT NULL DEFAULT 'UPCOMING',
    "score" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "dismissedBy" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDealPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "region" TEXT NOT NULL DEFAULT 'US',
    "platforms" TEXT NOT NULL DEFAULT '[]',
    "stores" TEXT NOT NULL DEFAULT '[]',
    "priceThreshold" DOUBLE PRECISION,
    "notifyOn" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDealPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameDeal" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'ITAD',
    "store" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "msrp" DOUBLE PRECISION NOT NULL,
    "discountPercent" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "isHistoricalLow" BOOLEAN NOT NULL DEFAULT false,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameDeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dealAlerts" BOOLEAN NOT NULL DEFAULT true,
    "groupInvites" BOOLEAN NOT NULL DEFAULT true,
    "friendActivity" BOOLEAN NOT NULL DEFAULT true,
    "recommendations" BOOLEAN NOT NULL DEFAULT true,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPrivacyPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "showActivityToGroup" BOOLEAN NOT NULL DEFAULT true,
    "showGameStatus" BOOLEAN NOT NULL DEFAULT true,
    "showRatings" BOOLEAN NOT NULL DEFAULT true,
    "showNotes" BOOLEAN NOT NULL DEFAULT false,
    "showOnlineStatus" BOOLEAN NOT NULL DEFAULT true,
    "allowGroupInvites" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPrivacyPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TierList" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT,
    "groupId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "categories" TEXT NOT NULL DEFAULT '[]',
    "platforms" TEXT NOT NULL DEFAULT '[]',
    "gameModes" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TierList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TierListGame" (
    "id" TEXT NOT NULL,
    "tierListId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TierListGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDiscordConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "discordUsername" TEXT NOT NULL,
    "discordAvatar" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "showDiscordStatus" BOOLEAN NOT NULL DEFAULT true,
    "syncNowPlaying" BOOLEAN NOT NULL DEFAULT true,
    "lastActivitySync" TIMESTAMP(3),
    "currentGame" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastOnline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDiscordConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupDiscordSettings" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "webhookUrl" TEXT,
    "channelId" TEXT,
    "serverId" TEXT,
    "enableWebhook" BOOLEAN NOT NULL DEFAULT false,
    "notifyNewGames" BOOLEAN NOT NULL DEFAULT true,
    "notifyNowPlaying" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupDiscordSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Group_inviteCode_key" ON "Group"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_userId_key" ON "GroupMember"("groupId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Game_provider_providerGameId_key" ON "Game"("provider", "providerGameId");

-- CreateIndex
CREATE UNIQUE INDEX "UserGameEntry_userId_gameId_key" ON "UserGameEntry"("userId", "gameId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupInterestProfile_groupId_key" ON "GroupInterestProfile"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "UserDealPreference_userId_key" ON "UserDealPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserNotificationPreference_userId_key" ON "UserNotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPrivacyPreference_userId_key" ON "UserPrivacyPreference"("userId");

-- CreateIndex
CREATE INDEX "TierList_userId_idx" ON "TierList"("userId");

-- CreateIndex
CREATE INDEX "TierList_groupId_idx" ON "TierList"("groupId");

-- CreateIndex
CREATE INDEX "TierList_isPublic_idx" ON "TierList"("isPublic");

-- CreateIndex
CREATE INDEX "TierListGame_tierListId_idx" ON "TierListGame"("tierListId");

-- CreateIndex
CREATE UNIQUE INDEX "TierListGame_tierListId_gameId_key" ON "TierListGame"("tierListId", "gameId");

-- CreateIndex
CREATE UNIQUE INDEX "UserDiscordConnection_userId_key" ON "UserDiscordConnection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserDiscordConnection_discordId_key" ON "UserDiscordConnection"("discordId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupDiscordSettings_groupId_key" ON "GroupDiscordSettings"("groupId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGameEntry" ADD CONSTRAINT "UserGameEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGameEntry" ADD CONSTRAINT "UserGameEntry_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGameEntry" ADD CONSTRAINT "UserGameEntry_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupInterestProfile" ADD CONSTRAINT "GroupInterestProfile_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupRecommendation" ADD CONSTRAINT "GroupRecommendation_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupRecommendation" ADD CONSTRAINT "GroupRecommendation_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDealPreference" ADD CONSTRAINT "UserDealPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameDeal" ADD CONSTRAINT "GameDeal_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotificationPreference" ADD CONSTRAINT "UserNotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPrivacyPreference" ADD CONSTRAINT "UserPrivacyPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TierListGame" ADD CONSTRAINT "TierListGame_tierListId_fkey" FOREIGN KEY ("tierListId") REFERENCES "TierList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDiscordConnection" ADD CONSTRAINT "UserDiscordConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupDiscordSettings" ADD CONSTRAINT "GroupDiscordSettings_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
