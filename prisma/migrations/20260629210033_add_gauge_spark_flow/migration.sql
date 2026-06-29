-- CreateEnum
CREATE TYPE "GaugeResponse" AS ENUM ('IN', 'MAYBE', 'OUT');

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "gaugeId" TEXT;

-- CreateTable
CREATE TABLE "Gauge" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "eventId" TEXT,
    "threshold" INTEGER NOT NULL DEFAULT 3,
    "bumped" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gauge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GaugeVote" (
    "id" TEXT NOT NULL,
    "gaugeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "response" "GaugeResponse" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GaugeVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Gauge_groupId_idx" ON "Gauge"("groupId");

-- CreateIndex
CREATE INDEX "GaugeVote_gaugeId_idx" ON "GaugeVote"("gaugeId");

-- CreateIndex
CREATE UNIQUE INDEX "GaugeVote_gaugeId_userId_key" ON "GaugeVote"("gaugeId", "userId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_gaugeId_fkey" FOREIGN KEY ("gaugeId") REFERENCES "Gauge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gauge" ADD CONSTRAINT "Gauge_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gauge" ADD CONSTRAINT "Gauge_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GaugeVote" ADD CONSTRAINT "GaugeVote_gaugeId_fkey" FOREIGN KEY ("gaugeId") REFERENCES "Gauge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GaugeVote" ADD CONSTRAINT "GaugeVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
