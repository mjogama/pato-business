import type { AuthUser, LoginInput } from "@common/modules/auth";

import { authClient } from "@/lib/api/auth-client";

/** POST /auth/login. On success the server sets the access and refresh cookies. */
export const login = (input: LoginInput) => authClient.post<AuthUser>("/auth/login", input);

/** GET /auth/me. Refreshes the session once if the access cookie is stale; goes to the login page if that fails. */
export const getSession = () => authClient.get<AuthUser>("/auth/me");

/** POST /auth/logout. Clears this browser's session cookies. */
export const logout = () => authClient.post<null>("/auth/logout");

/** POST /auth/logout-all. Ends every session on every device, this one included. */
export const logoutEverywhere = () => authClient.postAsOwner<null>("/auth/logout-all");
