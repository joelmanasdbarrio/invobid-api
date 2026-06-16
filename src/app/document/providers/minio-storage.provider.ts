import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as MinioClient } from 'minio';
import { IStorageProvider } from '../interfaces/storage-provider.interface';

@Injectable()
export class MinioStorageProvider implements IStorageProvider {
  private minioClient: MinioClient;
  private bucket: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT');
    const port = this.configService.get<number>('MINIO_PORT');
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY');
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY');
    this.bucket = this.configService.get<string>('MINIO_BUCKET')!;

    if (!endpoint)
      throw new InternalServerErrorException(
        'MinIO configuration is incomplete. Missing "MINIO_ENDPOINT"',
      );
    if (!accessKey)
      throw new InternalServerErrorException(
        'MinIO configuration is incomplete. Missing "MINIO_ACCESS_KEY"',
      );
    if (!secretKey)
      throw new InternalServerErrorException(
        'MinIO configuration is incomplete. Missing "MINIO_SECRET_KEY"',
      );
    if (!this.bucket)
      throw new InternalServerErrorException(
        'MinIO configuration is incomplete. Missing "MINIO_BUCKET"',
      );

    this.minioClient = new MinioClient({
      endPoint: endpoint,
      port: port || 9000,
      useSSL: false,
      accessKey,
      secretKey,
    });
  }

  async uploadFile(file: Buffer, fileName: string): Promise<string> {
    try {
      await this.minioClient.putObject(
        this.bucket,
        fileName,
        file,
        file.length,
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
      const dataStream = await this.minioClient.getObject(this.bucket, path);

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
      await this.minioClient.removeObject(this.bucket, path);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        `Failed to delete file from MinIO: ${message}`,
      );
    }
  }
}
