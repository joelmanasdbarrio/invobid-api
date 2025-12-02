import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuctionModule } from './app/auction/auction.module';
import { BankAccountModule } from './app/bank-account/bank-account.module';
import { BidModule } from './app/bid/bid.module';
import { DocumentModule } from './app/document/document.module';
import { InvoiceModule } from './app/invoice/invoice.module';
import { AdminModule } from './app/user/admin/admin.module';
import { UsersModule } from './app/user/common/users.module';
import { InvestorModule } from './app/user/investor/investor.module';
import { SupplierModule } from './app/user/supplier/supplier.module';
import { EnvConfiguration } from './config/env.config';
import { EnvConfigSchema } from './config/env.schema';
import { AuthModule } from './app/user/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [EnvConfiguration],
      validationSchema: EnvConfigSchema,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_NAME,
      username: process.env.DB_USR,
      password: process.env.DB_PWD,
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    UsersModule,
    SupplierModule,
    InvestorModule,
    AdminModule,
    InvoiceModule,
    AuctionModule,
    DocumentModule,
    BidModule,
    BankAccountModule,
    AuthModule,
  ],
})
export class AppModule {}
