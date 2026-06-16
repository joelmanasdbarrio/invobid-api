import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentModule } from './document.module';
import { MinioStorageProvider } from 'src/app/document/providers/minio-storage.provider';

jest.mock('src/app/document/providers/minio-storage.provider');

const MockMinioStorageService = MinioStorageProvider as jest.MockedClass<
  typeof MinioStorageProvider
>;

type FactoryProvider = {
  provide: string;
  useFactory: (configService: ConfigService) => unknown;
};

const getStorageFactory = (): FactoryProvider['useFactory'] => {
  const providers = Reflect.getMetadata(
    'providers',
    DocumentModule,
  ) as FactoryProvider[];
  const provider = providers.find((p) => p.provide === 'STORAGE_SERVICE');
  if (!provider?.useFactory)
    throw new Error('STORAGE_SERVICE factory not found');
  return provider.useFactory;
};

const makeConfigService = (env: string | undefined): ConfigService =>
  ({ get: jest.fn().mockReturnValue(env) }) as unknown as ConfigService;

describe('DocumentModule — STORAGE_SERVICE factory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a MinioStorageProvider when NODE_ENV is "local"', () => {
    const mockConfig = makeConfigService('local');
    const factory = getStorageFactory();

    const result = factory(mockConfig);

    expect(MockMinioStorageService).toHaveBeenCalledWith(mockConfig);
    expect(result).toBeInstanceOf(MinioStorageProvider);
  });

  it('should throw InternalServerErrorException for any other environment', () => {
    const mockConfig = makeConfigService('production');
    const factory = getStorageFactory();

    expect(() => factory(mockConfig)).toThrow(InternalServerErrorException);
  });
});
