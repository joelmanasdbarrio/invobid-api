import { InternalServerErrorException, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { Document } from './entities/document.entity';
import { IStorageProvider } from './interfaces/storage-provider.interface';
import { MinioStorageProvider } from 'src/app/document/providers/minio-storage.provider';

@Module({
  imports: [TypeOrmModule.forFeature([Document]), ConfigModule],
  controllers: [DocumentController],
  providers: [
    DocumentService,
    {
      provide: 'STORAGE_SERVICE',
      useFactory: (configService: ConfigService): IStorageProvider => {
        const environment = configService.get<string>('NODE_ENV');

        if (environment !== 'production') {
          return new MinioStorageProvider(configService);
        }

        throw new InternalServerErrorException(
          'No valid storage service configured for this environment',
        );
      },
      inject: [ConfigService],
    },
  ],
  exports: [DocumentService],
})
export class DocumentModule {}
