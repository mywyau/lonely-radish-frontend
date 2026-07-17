import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

const hasR2Env = Boolean(accountId && accessKeyId && secretAccessKey && process.env.R2_BUCKET_NAME);

function createMockR2Client() {
  if (process.env.NODE_ENV !== "test") {
    console.warn("[r2] Missing R2 env vars; using mock R2 storage client");
  }

  return {
    async send() {
      return {
        $metadata: {
          httpStatusCode: 200,
        },
        Body: new Uint8Array(),
        ContentType: "audio/webm",
      };
    },
  };
}

export const r2BucketName = process.env.R2_BUCKET_NAME || "local-mock-r2-bucket";

export const r2Client = hasR2Env
  ? new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
    })
  : createMockR2Client();

type CreateEchoLabUploadUrlInput = {
  objectKey: string;
  contentType: string;
};

export async function createEchoLabUploadUrl({
  objectKey,
  contentType,
}: CreateEchoLabUploadUrlInput): Promise<string> {
  if (!hasR2Env) {
    return `/api/mock-r2-upload?key=${encodeURIComponent(objectKey)}&contentType=${encodeURIComponent(contentType)}`;
  }

  const command = new PutObjectCommand({
    Bucket: r2BucketName,
    Key: objectKey,
    ContentType: contentType,
  });

  return getSignedUrl(r2Client as S3Client, command, {
    expiresIn: 60,
  });
}
