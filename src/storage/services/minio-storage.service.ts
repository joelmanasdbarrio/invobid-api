import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as MinioClient } from 'minio';
import { v4 as uuid } from 'uuid';
import { BucketType, IStorageService } from '../interfaces/storage.interface';

@Injectable()
export class MinioStorageService implements IStorageService {
  private minioClient: MinioClient;
  private bucket: string;
  private prefix: string;

  constructor(
    private readonly configService: ConfigService,
    bucketType: BucketType,
  ) {
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT');
    const port = this.configService.get<number>('MINIO_PORT');
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY');
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY');
    const docsBucketName = this.configService.get<string>(
      'MINIO_DOCS_BUCKET_NAME',
    );
    const publicBucketName = this.configService.get<string>(
      'MINIO_PUBLIC_BUCKET_NAME',
    );

    if (
      !endpoint ||
      !accessKey ||
      !secretKey ||
      !docsBucketName ||
      !publicBucketName
    ) {
      throw new InternalServerErrorException(
        'MinIO configuration is incomplete. Check environment variables.',
      );
    }

    const bucketPath =
      bucketType === BucketType.DOCUMENTS ? docsBucketName : publicBucketName;

    const [bucketName, ...prefixParts] = bucketPath.split('/');
    this.bucket = bucketName;
    this.prefix = prefixParts.length > 0 ? prefixParts.join('/') + '/' : '';

    this.minioClient = new MinioClient({
      endPoint: endpoint,
      port: port || 9000,
      useSSL: false,
      accessKey,
      secretKey,
    });
  }

  async onModuleInit() {
    await this.healthCheck();
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Check if bucket exists (this validates credentials and connection)
      const bucketExists = await this.minioClient.bucketExists(this.bucket);

      if (!bucketExists) {
        throw new InternalServerErrorException(
          `MinIO bucket '${this.bucket}' does not exist`,
        );
      }

      this.minioClient.listObjects(this.bucket, this.prefix, false);

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        `MinIO health check failed: ${message}. Check your credentials and bucket configuration.`,
      );
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    fileName?: string,
  ): Promise<string> {
    const id = uuid();

    if (!fileName) fileName = id + '.' + file.originalname.split('.').pop();

    const objectName = this.prefix + fileName;

    try {
      await this.minioClient.putObject(
        this.bucket,
        objectName,
        file.buffer,
        file.buffer.length,
      );

      return fileName;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        `Failed to upload file to MinIO: ${message}`,
      );
    }
  }

  async getFile(path: string): Promise<Buffer> {
    try {
      const objectName = this.prefix + path;
      const dataStream = await this.minioClient.getObject(
        this.bucket,
        objectName,
      );

      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];

        dataStream.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        dataStream.on('end', () => {
          resolve(Buffer.concat(chunks));
        });

        dataStream.on('error', (error: unknown) => {
          const message =
            error instanceof Error ? error.message : String(error);
          reject(
            new InternalServerErrorException(
              `Failed to retrieve file from MinIO: ${message}`,
            ),
          );
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        `Failed to retrieve file from MinIO: ${message}`,
      );
    }
  }

  async deleteFile(path: string): Promise<void> {
    try {
      const objectName = this.prefix + path;
      await this.minioClient.removeObject(this.bucket, objectName);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        `Failed to delete file from MinIO: ${message}`,
      );
    }
  }
}
