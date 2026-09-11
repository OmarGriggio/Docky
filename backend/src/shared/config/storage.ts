import { S3Client } from "@aws-sdk/client-s3";

// Talks to MinIO in dev/prod (both self-hosted, see zz_docs/Decisions.md) -
// same client works unchanged against a real S3/R2 later, only the env vars
// below would need to change.
export const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  // MinIO needs path-style addressing (endpoint/bucket/key) - the SDK
  // defaults to virtual-hosted-style (bucket.endpoint), which needs DNS
  // MinIO doesn't have.
  forcePathStyle: true,
});

export const S3_BUCKET = process.env.S3_BUCKET!;
