import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auction } from 'src/app/auction/entities/auction.entity';
import { BankAccount } from 'src/app/bank-account/entities/bank-account.entity';
import { Bid } from 'src/app/bid/entities/bid.entity';
import { Debtor } from 'src/app/debtor/entities/debtor.entity';
import { Document } from 'src/app/document/entities/document.entity';
import { Invoice } from 'src/app/invoice/entities/invoice.entity';
import { Admin } from 'src/app/user/admin/entities/admin.entity';
import { User } from 'src/app/user/common/entities/user.entity';
import { Investor } from 'src/app/user/investor/entities/investor.entity';
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
        Investor,
        Debtor,
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
      Investor,
      Debtor,
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
