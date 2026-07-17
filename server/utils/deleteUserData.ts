import { db } from "~/server/repositories/db";

export async function deleteUserData(userId: string) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    await client.query(`DELETE FROM users WHERE id = $1`, [userId]);

    await client.query("COMMIT");
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore rollback failure
    }
    throw err;
  } finally {
    client.release();
  }
}
