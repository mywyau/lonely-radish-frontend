import { db } from "~/server/repositories/db";
import { PROFILE_PHOTO_BUCKET, storageAdmin } from "~/server/utils/supabaseStorage";

export async function deleteUserData(userId: string, ownedBusinessIds: string[] = []) {
  const photos = await db.query<{ storage_key: string | null; thumbnail_storage_key: string | null }>(
    `select storage_key,thumbnail_storage_key from profile_photos where user_id=$1`, [userId],
  );
  const storageKeys = photos.rows.flatMap(photo =>
    [photo.storage_key, photo.thumbnail_storage_key].filter((key): key is string => Boolean(key)));
  if (storageKeys.length) {
    const { error } = await storageAdmin().storage.from(PROFILE_PHOTO_BUCKET).remove(storageKeys);
    if (error) throw new Error(`Could not delete profile photos: ${error.message}`);
  }
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    if (ownedBusinessIds.length) {
      await client.query(
        `DELETE FROM businesses
         WHERE id = ANY($1::uuid[])
           AND NOT EXISTS (
             SELECT 1 FROM business_members
             WHERE business_id = businesses.id AND user_id <> $2
           )`,
        [ownedBusinessIds, userId],
      );
    }

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
