import bcrypt from "bcryptjs";

import type { AuthUser, LoginInput } from "./auth.schema";
import { UnauthorizedError } from "@shared/errors/AppError";
import { signToken, verifyToken } from "@shared/auth/tokens";
import type { AuthRepository, UserRecord } from "./auth.repository";

export interface Session {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

// Compared against when the username is unknown, so a miss takes as long as a wrong password.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

const toUser = ({ id, username }: UserRecord): AuthUser => ({ id, username });

const toSession = (record: UserRecord): Session => ({
  user: toUser(record),
  accessToken: signToken("access", record.id, record.tokenVersion),
  refreshToken: signToken("refresh", record.id, record.tokenVersion),
});

export class AuthService {
  constructor(private readonly repository: AuthRepository) {}

  async login({ username, password }: LoginInput): Promise<Session> {
    const record = await this.repository.findByUsername(username);
    const matches = await bcrypt.compare(password, record?.passwordHash ?? DUMMY_HASH);
    if (!record || !matches) throw new UnauthorizedError("Invalid username or password");
    return toSession(record);
  }

  /** A new session from a refresh token, unless it was issued before the last "sign out everywhere". */
  async refresh(refreshToken: string): Promise<Session> {
    const { userId, version } = verifyToken("refresh", refreshToken);
    const record = await this.repository.findById(userId);
    if (!record || record.tokenVersion !== version) throw new UnauthorizedError("Invalid or expired session");
    return toSession(record);
  }

  /** Ends every session of this user, on every device. */
  async logoutEverywhere(userId: string): Promise<void> {
    await this.repository.bumpTokenVersion(userId);
  }

  async me(userId: string): Promise<AuthUser> {
    const record = await this.repository.findById(userId);
    if (!record) throw new UnauthorizedError("Invalid or expired session");
    return toUser(record);
  }
}
