import db from "@app/config/db";

/** The user's current `tokenVersion`, or null when the user no longer exists. One primary-key read per call. */
export const currentTokenVersion = async (userId: string): Promise<number | null> =>
  (await db.user.findUnique({ where: { id: userId }, select: { tokenVersion: true } }))?.tokenVersion ?? null;
