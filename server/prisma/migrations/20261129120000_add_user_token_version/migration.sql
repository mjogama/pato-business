-- AlterTable: "sign out everywhere" bumps this; existing sessions (version 0) keep working.
ALTER TABLE "users" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
