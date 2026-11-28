import { vi } from "vitest";

// requireAuth reads each token's version from the database; tests sign tokens for a user that isn't there,
// so the check answers version 0 unless a test says otherwise (`vi.mocked(currentTokenVersion)`).
vi.mock("@shared/auth/session", () => ({ currentTokenVersion: vi.fn(async () => 0) }));
