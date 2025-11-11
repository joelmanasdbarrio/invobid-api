import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuctionModule } from './auction/auction.module';
import { BankAccountModule } from './bank-account/bank-account.module';
import { BidModule } from './bid/bid.module';
import { DocumentModule } from './document/document.module';
import { InvoiceModule } from './invoice/invoice.module';
import { AdminModule } from './user/admin/admin.module';
import { UsersModule } from './user/common/users.module';
import { InvestorModule } from './user/investor/investor.module';
import { SupplierModule } from './user/supplier/supplier.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
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
  ],
})
export class AppModule {}
