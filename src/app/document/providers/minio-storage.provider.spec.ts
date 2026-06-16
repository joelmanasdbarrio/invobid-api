import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { PassThrough } from 'stream';
import { MinioStorageProvider } from './minio-storage.provider';

jest.mock('minio', () => ({
  Client: jest.fn().mockImplementation(() => ({
    putObject: jest.fn(),
    getObject: jest.fn(),
    removeObject: jest.fn(),
  })),
}));

const MockClient = Client as jest.MockedClass<typeof Client>;

const makeConfigService = (
  overrides: Record<string, unknown> = {},
): ConfigService => {
  const defaults: Record<string, unknown> = {
    MINIO_ENDPOINT: 'localhost',
    MINIO_PORT: 9000,
    MINIO_ACCESS_KEY: 'access-key',
    MINIO_SECRET_KEY: 'secret-key',
    MINIO_BUCKET: 'test-bucket',
    ...overrides,
  };
  return {
    get: jest.fn((key: string) => defaults[key]),
  } as unknown as ConfigService;
};

describe('MinioStorageProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw InternalServerErrorException when MINIO_ENDPOINT is missing', () => {
      expect(
        () =>
          new MinioStorageProvider(
            makeConfigService({ MINIO_ENDPOINT: undefined }),
          ),
      ).toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when MINIO_ACCESS_KEY is missing', () => {
      expect(
        () =>
          new MinioStorageProvider(
            makeConfigService({ MINIO_ACCESS_KEY: undefined }),
          ),
      ).toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when MINIO_SECRET_KEY is missing', () => {
      expect(
        () =>
          new MinioStorageProvider(
            makeConfigService({ MINIO_SECRET_KEY: undefined }),
          ),
      ).toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when MINIO_BUCKET is missing', () => {
      expect(
        () =>
          new MinioStorageProvider(
            makeConfigService({ MINIO_BUCKET: undefined }),
          ),
      ).toThrow(InternalServerErrorException);
    });

    it('should instantiate MinioClient with provided config', () => {
      new MinioStorageProvider(makeConfigService());

      expect(MockClient).toHaveBeenCalledWith(
        expect.objectContaining({
          endPoint: 'localhost',
          port: 9000,
          accessKey: 'access-key',
          secretKey: 'secret-key',
        }),
      );
    });
  });

  describe('uploadFile', () => {
    let service: MinioStorageProvider;
    let mockClient: {
      putObject: jest.Mock;
      getObject: jest.Mock;
      removeObject: jest.Mock;
    };

    beforeEach(() => {
      service = new MinioStorageProvider(makeConfigService());
      mockClient = MockClient.mock.results[MockClient.mock.results.length - 1]
        .value as typeof mockClient;
    });

    it('should call putObject and return the fileName', async () => {
      mockClient.putObject.mockResolvedValue(undefined);
      const buffer = Buffer.from('file-content');

      const result = await service.uploadFile(buffer, 'test-file.pdf');

      expect(mockClient.putObject).toHaveBeenCalledWith(
        'test-bucket',
        'test-file.pdf',
        buffer,
        buffer.length,
      );
      expect(result).toBe('test-file.pdf');
    });

    it('should throw InternalServerErrorException when putObject rejects', async () => {
      mockClient.putObject.mockRejectedValue(new Error('upload failed'));

      await expect(
        service.uploadFile(Buffer.from('data'), 'file.pdf'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getFile', () => {
    let service: MinioStorageProvider;
    let mockClient: {
      putObject: jest.Mock;
      getObject: jest.Mock;
      removeObject: jest.Mock;
    };

    beforeEach(() => {
      service = new MinioStorageProvider(makeConfigService());
      mockClient = MockClient.mock.results[MockClient.mock.results.length - 1]
        .value as typeof mockClient;
    });

    it('should resolve with concatenated buffer from stream data events', async () => {
      const stream = new PassThrough();
      mockClient.getObject.mockResolvedValue(stream);

      const promise = service.getFile('path/to/file.pdf');

      // defer until after `await getObject` resolves and listeners are registered
      await new Promise<void>((resolve) => setImmediate(resolve));
      stream.emit('data', Buffer.from('chunk1'));
      stream.emit('data', Buffer.from('chunk2'));
      stream.emit('end');

      const result = await promise;

      expect(result).toEqual(
        Buffer.concat([Buffer.from('chunk1'), Buffer.from('chunk2')]),
      );
    });

    it('should reject with InternalServerErrorException on stream error event', async () => {
      const stream = new PassThrough();
      // prevent Node from throwing unhandled error before service listener attaches
      stream.on('error', () => {});
      mockClient.getObject.mockResolvedValue(stream);

      const promise = service.getFile('path/to/file.pdf');

      await new Promise<void>((resolve) => setImmediate(resolve));
      stream.emit('error', new Error('stream error'));

      await expect(promise).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when getObject itself throws', async () => {
      mockClient.getObject.mockRejectedValue(new Error('connection refused'));

      await expect(service.getFile('path/to/file.pdf')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('deleteFile', () => {
    let service: MinioStorageProvider;
    let mockClient: {
      putObject: jest.Mock;
      getObject: jest.Mock;
      removeObject: jest.Mock;
    };

    beforeEach(() => {
      service = new MinioStorageProvider(makeConfigService());
      mockClient = MockClient.mock.results[MockClient.mock.results.length - 1]
        .value as typeof mockClient;
    });

    it('should call removeObject with bucket and path', async () => {
      mockClient.removeObject.mockResolvedValue(undefined);

      await service.deleteFile('path/to/file.pdf');

      expect(mockClient.removeObject).toHaveBeenCalledWith(
        'test-bucket',
        'path/to/file.pdf',
      );
    });

    it('should throw InternalServerErrorException when removeObject rejects', async () => {
      mockClient.removeObject.mockRejectedValue(new Error('delete failed'));

      await expect(service.deleteFile('path/to/file.pdf')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
