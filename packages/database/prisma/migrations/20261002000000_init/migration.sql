-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "monitor_status" AS ENUM ('PENDING', 'UP', 'DOWN', 'PAUSED');

-- CreateEnum
CREATE TYPE "channel_type" AS ENUM ('EMAIL', 'WEBHOOK');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "family_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitors" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'GET',
    "interval_seconds" INTEGER NOT NULL,
    "timeout_ms" INTEGER NOT NULL DEFAULT 10000,
    "expected_status" INTEGER,
    "failure_threshold" INTEGER NOT NULL DEFAULT 2,
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "is_seeded" BOOLEAN NOT NULL DEFAULT false,
    "status" "monitor_status" NOT NULL DEFAULT 'PENDING',
    "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
    "last_checked_at" TIMESTAMPTZ(3),
    "last_response_ms" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "monitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checks" (
    "id" BIGSERIAL NOT NULL,
    "monitor_id" INTEGER NOT NULL,
    "scheduled_for" TIMESTAMPTZ(3) NOT NULL,
    "checked_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ok" BOOLEAN,
    "status_code" INTEGER,
    "response_ms" INTEGER,
    "error" TEXT,

    CONSTRAINT "checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" SERIAL NOT NULL,
    "monitor_id" INTEGER NOT NULL,
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "ended_at" TIMESTAMPTZ(3),
    "cause" TEXT NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_stats" (
    "monitor_id" INTEGER NOT NULL,
    "day" DATE NOT NULL,
    "up_count" INTEGER NOT NULL,
    "down_count" INTEGER NOT NULL,
    "avg_response_ms" INTEGER,

    CONSTRAINT "daily_stats_pkey" PRIMARY KEY ("monitor_id","day")
);

-- CreateTable
CREATE TABLE "notification_channels" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" "channel_type" NOT NULL,
    "target" TEXT NOT NULL,
    "secret" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "send_on_down" BOOLEAN NOT NULL DEFAULT true,
    "send_on_recover" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_channels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "monitors_user_id_idx" ON "monitors"("user_id");

-- CreateIndex
CREATE INDEX "checks_monitor_id_checked_at_idx" ON "checks"("monitor_id", "checked_at");

-- CreateIndex
CREATE UNIQUE INDEX "checks_monitor_id_scheduled_for_key" ON "checks"("monitor_id", "scheduled_for");

-- CreateIndex
CREATE INDEX "incidents_monitor_id_started_at_idx" ON "incidents"("monitor_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "incidents_one_open_per_monitor" ON "incidents"("monitor_id") WHERE (ended_at IS NULL);

-- CreateIndex
CREATE INDEX "notification_channels_user_id_idx" ON "notification_channels"("user_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitors" ADD CONSTRAINT "monitors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checks" ADD CONSTRAINT "checks_monitor_id_fkey" FOREIGN KEY ("monitor_id") REFERENCES "monitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_monitor_id_fkey" FOREIGN KEY ("monitor_id") REFERENCES "monitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_stats" ADD CONSTRAINT "daily_stats_monitor_id_fkey" FOREIGN KEY ("monitor_id") REFERENCES "monitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_channels" ADD CONSTRAINT "notification_channels_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
