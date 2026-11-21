import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

export interface StoredMessagePayload {
  providerMessageId: string;
  recipient: string;
  fromAddress: string | null;
  fromName: string | null;
  subject: string | null;
  text: string | null;
  html: string | null;
  preview: string | null;
  receivedAt: string;
  expiresAt: string;
  sizeBytes: number;
  hasAttachments: boolean;
  attachments: Array<{
    filename: string | null;
    mimeType: string;
    size: number;
  }>;
}

let cachedClient: S3Client | null = null;

function bucket(): string {
  const name = process.env.R2_BUCKET_NAME;
  if (!name) throw new Error("R2_NOT_CONFIGURED");
  return name;
}

function client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2_NOT_CONFIGURED");
  }

  if (!cachedClient) {
    cachedClient = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });
  }
  return cachedClient;
}

export async function getStoredMessage(
  key: string
): Promise<StoredMessagePayload> {
  const response = await client().send(
    new GetObjectCommand({ Bucket: bucket(), Key: key })
  );
  if (!response.Body) throw new Error("STORAGE_OBJECT_EMPTY");
  const raw = await response.Body.transformToString();
  return JSON.parse(raw) as StoredMessagePayload;
}

export async function deleteStoredObject(key: string | null): Promise<void> {
  if (!key) return;
  await client().send(
    new DeleteObjectCommand({ Bucket: bucket(), Key: key })
  );
}
