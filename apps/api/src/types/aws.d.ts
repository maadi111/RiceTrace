declare module "@aws-sdk/client-s3" {
  export interface S3ClientConfig {
    region?: string;
    credentials?: {
      accessKeyId: string;
      secretAccessKey: string;
    };
    endpoint?: string;
  }

  export class S3Client {
    constructor(config: S3ClientConfig);
    send(command: unknown): Promise<unknown>;
  }

  export interface PutObjectCommandInput {
    Bucket: string;
    Key: string;
    Body: Buffer;
    ContentType?: string;
    ACL?: string;
  }

  export class PutObjectCommand {
    constructor(input: PutObjectCommandInput);
  }

  export interface DeleteObjectCommandInput {
    Bucket: string;
    Key: string;
  }

  export class DeleteObjectCommand {
    constructor(input: DeleteObjectCommandInput);
  }

  export interface GetObjectCommandInput {
    Bucket: string;
    Key: string;
  }

  export class GetObjectCommand {
    constructor(input: GetObjectCommandInput);
  }
}

declare module "@aws-sdk/s3-request-presigner" {
  export interface RequestPresignerOptions {
    expiresIn?: number;
  }

  export function getSignedUrl(
    client: unknown,
    command: unknown,
    options?: RequestPresignerOptions
  ): Promise<string>;
}
