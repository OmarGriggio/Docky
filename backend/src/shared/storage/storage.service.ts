import { Readable } from "stream";
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
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

// For the health check (modules/health): whether the bucket answers at all.
export const pingStorageServ = async (): Promise<void> => {
  await s3.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
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

// Every key under `prefix` (e.g. "companies/2/"), one page of up to 1000 at
// a time - ListObjectsV2's own page size, also DeleteObjects' own limit.
// Returns how many were deleted.
export const deleteFilesWithPrefixServ = async (prefix: string): Promise<number> => {
  let deleted = 0;
  let continuationToken: string | undefined;

  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: S3_BUCKET, Prefix: prefix, ContinuationToken: continuationToken }));
    const keys = (page.Contents ?? []).flatMap(object => object.Key ? [{ Key: object.Key }] : []);

    if (keys.length > 0) {
      await s3.send(new DeleteObjectsCommand({ Bucket: S3_BUCKET, Delete: { Objects: keys } }));
      deleted += keys.length;
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

  return deleted;
};
