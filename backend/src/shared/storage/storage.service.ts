import { Readable } from "stream";
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  NoSuchKey,
} from "@aws-sdk/client-s3";
import { s3, S3_BUCKET } from "../config/storage";

// MinIO doesn't create a bucket on its own - call this once at startup
// (see server.ts) so uploads don't fail against a fresh instance.
export const ensureBucketExistsServ = async (): Promise<void> => {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
  }
};

export const uploadFileServ = async (key: string, body: Buffer, contentType: string): Promise<void> => {
  await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: body, ContentType: contentType }));
};

export interface StoredFile {
  body: Readable;
  contentType?: string;
}

export const getFileServ = async (key: string): Promise<StoredFile | null> => {
  try {
    const result = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    // Body is typed generically by the SDK (works across browser/Node), but
    // on Node it's always a Readable at runtime.
    return { body: result.Body as Readable, contentType: result.ContentType };
  } catch (err) {
    // GetObject on a missing key throws NoSuchKey - not the same exception
    // HeadObject/HeadBucket use (NotFound).
    if (err instanceof NoSuchKey) {
      return null;
    }
    throw err;
  }
};

// S3's DeleteObject is idempotent - deleting a key that doesn't exist isn't
// an error, so callers don't need to check existence first.
export const deleteFileServ = async (key: string): Promise<void> => {
  await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
};
