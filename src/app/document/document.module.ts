import { InternalServerErrorException, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { Document } from './entities/document.entity';
import { IStorageService } from './interfaces/storage.interface';
import { MinioStorageService } from './services/minio-storage.service';

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
          return new MinioStorageService(configService);
        }

        throw new InternalServerErrorException(
          'No valid storage service configured for this environment',
        );
      },
      inject: [ConfigService],
    },
  ],
})
export class DocumentModule {}
