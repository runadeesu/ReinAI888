-- CreateTable
CREATE TABLE "ReinChatVerificationCode" (
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReinChatVerificationCode_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "ReinChatLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reinchatUserId" TEXT NOT NULL,
    "reinchatEmail" TEXT NOT NULL,
    "reinchatDisplayId" TEXT NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReinChatLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReinChatVerificationCode_userId_idx" ON "ReinChatVerificationCode"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReinChatLink_userId_key" ON "ReinChatLink"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReinChatLink_reinchatUserId_key" ON "ReinChatLink"("reinchatUserId");

-- AddForeignKey
ALTER TABLE "ReinChatLink" ADD CONSTRAINT "ReinChatLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
