import db from "@app/config/db";

export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  tokenVersion: number;
}

export interface AuthRepository {
  findByUsername(username: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  /** Adds 1 to the user's `tokenVersion`, ending every session issued before. */
  bumpTokenVersion(id: string): Promise<void>;
}

export class PrismaAuthRepository implements AuthRepository {
  findByUsername(username: string): Promise<UserRecord | null> {
    return db.user.findUnique({ where: { username } });
  }

  findById(id: string): Promise<UserRecord | null> {
    return db.user.findUnique({ where: { id } });
  }

  async bumpTokenVersion(id: string): Promise<void> {
    await db.user.update({ where: { id }, data: { tokenVersion: { increment: 1 } } });
  }
}
