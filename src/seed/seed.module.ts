import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auction } from 'src/auction/entities/auction.entity';
import { BankAccount } from 'src/bank-account/entities/bank-account.entity';
import { Bid } from 'src/bid/entities/bid.entity';
import { Document } from 'src/document/entities/document.entity';
import { Invoice } from 'src/invoice/entities/invoice.entity';
import { Admin } from 'src/user/admin/entities/admin.entity';
import { User } from 'src/user/common/entities/user.entity';
import { Investor } from 'src/user/investor/entities/investor.entity';
import { Supplier } from 'src/user/supplier/entities/supplier.entity';
import { SeedService } from './seed.service';

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
      entities: [
        User,
        Admin,
        Supplier,
        Investor,
        Document,
        BankAccount,
        Invoice,
        Auction,
        Bid,
      ],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([
      Admin,
      Supplier,
      Investor,
      Document,
      BankAccount,
      Invoice,
      Auction,
      Bid,
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
