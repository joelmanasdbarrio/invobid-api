import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuctionModule } from './app/auction/auction.module';
import { BankAccountModule } from './app/bank-account/bank-account.module';
import { BidModule } from './app/bid/bid.module';
import { DebtorModule } from './app/debtor/debtor.module';
import { DocumentModule } from './app/document/document.module';
import { InvoiceModule } from './app/invoice/invoice.module';
import { AdminModule } from './app/user/admin/admin.module';
import { AuthModule } from './app/user/auth/auth.module';
import { UsersModule } from './app/user/common/users.module';
import { InvestorModule } from './app/user/investor/investor.module';
import { EnvConfiguration } from './config/env.config';
import { EnvConfigSchema } from './config/env.schema';
import { MetricModule } from './app/metric/metric.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [EnvConfiguration],
      validationSchema: EnvConfigSchema,
    }),
    ScheduleModule.forRoot(),
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
    InvestorModule,
    AdminModule,
    InvoiceModule,
    AuctionModule,
    DebtorModule,
    DocumentModule,
    BidModule,
    BankAccountModule,
    AuthModule,
    MetricModule,
  ],
})
export class AppModule {}
