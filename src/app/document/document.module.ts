import { InternalServerErrorException, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  BucketType,
  IStorageService,
} from '../../storage/interfaces/storage.interface';
import { MinioStorageService } from '../../storage/services/minio-storage.service';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { Document } from './entities/document.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Document]), ConfigModule],
  controllers: [DocumentController],
  providers: [
    DocumentService,
    {
      provide: 'STORAGE_SERVICE',
      useFactory: (configService: ConfigService): IStorageService => {
        const environment = configService.get<string>('NODE_ENV');

        if (environment === 'local') {
          return new MinioStorageService(configService, BucketType.DOCUMENTS);
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
