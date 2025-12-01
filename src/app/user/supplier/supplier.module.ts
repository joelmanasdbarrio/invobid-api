import { InternalServerErrorException, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankAccountModule } from 'src/app/bank-account/bank-account.module';
import { DocumentModule } from 'src/app/document/document.module';
import { BucketType } from 'src/storage/interfaces/storage.interface';
import { MinioStorageService } from 'src/storage/services/minio-storage.service';
import { Supplier } from './entities/supplier.entity';
import { SupplierController } from './supplier.controller';
import { SupplierService } from './supplier.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Supplier]),
    BankAccountModule,
    DocumentModule,
    ConfigModule,
  ],
  controllers: [SupplierController],
  providers: [
    SupplierService,
    {
      provide: 'STORAGE_SERVICE',
      useFactory: (configService: ConfigService) => {
        const environment = configService.get<string>('NODE_ENV');

        if (environment === 'local') {
          return new MinioStorageService(configService, BucketType.PUBLIC);
        }

        throw new InternalServerErrorException(
          'No valid storage service configured for this environment',
        );
      },
      inject: [ConfigService],
    },
  ],
})
export class SupplierModule {}
