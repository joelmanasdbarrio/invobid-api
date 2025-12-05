import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Auction } from 'src/app/auction/entities/auction.entity';
import { AuctionStatus } from 'src/app/auction/enum/auction-status.enum';
import { BankAccount } from 'src/app/bank-account/entities/bank-account.entity';
import { Bid } from 'src/app/bid/entities/bid.entity';
import { Document } from 'src/app/document/entities/document.entity';
import { Invoice } from 'src/app/invoice/entities/invoice.entity';
import { Admin } from 'src/app/user/admin/entities/admin.entity';
import { Investor } from 'src/app/user/investor/entities/investor.entity';
import { InvestorStatus } from 'src/app/user/investor/enums/investor-status.enum';
import { InvestorType } from 'src/app/user/investor/enums/investor-type.enum';
import { Repository } from 'typeorm';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(Investor)
    private readonly investorRepository: Repository<Investor>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(BankAccount)
    private readonly bankAccountRepository: Repository<BankAccount>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Auction)
    private readonly auctionRepository: Repository<Auction>,
    @InjectRepository(Bid)
    private readonly bidRepository: Repository<Bid>,
  ) {}

  async run() {
    console.log('🌱 Starting database seeding...');

    try {
      await this.clearDatabase();

      console.log('👤 Seeding admins...');
      const admins = await this.seedAdmins();

      console.log('💼 Seeding investors...');
      const investors = await this.seedInvestors();

      console.log('📄 Seeding invoices...');
      const invoices = await this.seedInvoices(investors);

      console.log('🔨 Seeding auctions...');
      const auctions = await this.seedAuctions(invoices);

      console.log('💰 Seeding bids...');
      await this.seedBids(auctions, investors);

      console.log('✅ Database seeding completed successfully!');
      console.log(`\t - ${admins.length} admins created`);
      console.log(`\t - ${investors.length} investors created`);
      console.log(`\t - ${invoices.length} invoices created`);
      console.log(`\t - ${auctions.length} auctions created`);
      console.log(`\t - ${auctions.length * 5} bids created`);
    } catch (error) {
      console.error('❌ Error seeding database:', error);
      throw error;
    }
  }

  async clearDatabase() {
    console.log('🗑️  Clearing existing data...');

    try {
      await this.investorRepository.delete({});
      await this.auctionRepository.delete({});
      await this.bidRepository.delete({});
      await this.invoiceRepository.delete({});
      await this.documentRepository.delete({});
      await this.bankAccountRepository.delete({});
      await this.adminRepository.delete({});
    } catch (err) {
      console.log(
        '⚠️  Warning: Could not clear all tables. This might be okay on first run:\n',
        err,
      );
    }
  }

  private async seedAdmins(): Promise<Admin[]> {
    const password = bcrypt.hashSync('Admin123!', 10);

    const admins = [
      this.adminRepository.create({
        email: 'admin1@invobid.com',
        password: password,
        name: 'John Administrator',
        isActive: true,
        type: 'admin',
      }),
      this.adminRepository.create({
        email: 'admin2@invobid.com',
        password: password,
        name: 'Jane Admin',
        isActive: true,
        type: 'admin',
      }),
    ];

    return await this.adminRepository.save(admins);
  }

  private async seedInvestors(): Promise<Investor[]> {
    const password = bcrypt.hashSync('Investor123!', 10);

    const investors: Investor[] = [];

    // Seller investors (individual type - small businesses)
    const seller1Document = this.documentRepository.create({
      title: 'TechCorp Business License',
    });

    const seller1BankAccount = this.bankAccountRepository.create({
      balance: 50000.0,
    });

    const seller1 = this.investorRepository.create({
      email: 'seller1@techcorp.com',
      password: password,
      name: 'Robert Tech',
      isActive: true,
      type: 'investor',
      phoneNumber: '1234567890',
      companyName: 'TechCorp Solutions',
      investorType: InvestorType.INDIVIDUAL,
      status: InvestorStatus.VERIFIED,
      isOptedInNotificationsEmail: true,
      isOptedInNotificationsSMS: false,
      document: seller1Document,
      bankAccount: seller1BankAccount,
    });

    const seller2Document = this.documentRepository.create({
      title: 'GlobalTrade Business Registration',
    });

    const seller2BankAccount = this.bankAccountRepository.create({
      balance: 75000.0,
    });

    const seller2 = this.investorRepository.create({
      email: 'seller2@globaltrade.com',
      password: password,
      name: 'Sarah Global',
      isActive: true,
      type: 'investor',
      phoneNumber: '9876543210',
      companyName: 'GlobalTrade Industries',
      investorType: InvestorType.INDIVIDUAL,
      status: InvestorStatus.VERIFIED,
      isOptedInNotificationsEmail: true,
      isOptedInNotificationsSMS: true,
      document: seller2Document,
      bankAccount: seller2BankAccount,
    });

    // Buyer investors (company type - investment funds)
    const buyer1Document = this.documentRepository.create({
      title: 'WealthFund Investment License',
    });

    const buyer1BankAccount = this.bankAccountRepository.create({
      balance: 500000.0,
    });

    const buyer1 = this.investorRepository.create({
      email: 'buyer1@wealthfund.com',
      password: password,
      name: 'Michael Wealth',
      isActive: true,
      type: 'investor',
      phoneNumber: '5551234567',
      companyName: 'WealthFund Capital',
      investorType: InvestorType.COMPANY,
      status: InvestorStatus.VERIFIED,
      isOptedInNotificationsEmail: true,
      isOptedInNotificationsSMS: true,
      document: buyer1Document,
      bankAccount: buyer1BankAccount,
    });

    const buyer2Document = this.documentRepository.create({
      title: 'Capital Partners Registration',
    });

    const buyer2BankAccount = this.bankAccountRepository.create({
      balance: 350000.0,
    });

    const buyer2 = this.investorRepository.create({
      email: 'buyer2@capitalpartners.com',
      password: password,
      name: 'John Doe',
      isActive: true,
      type: 'investor',
      phoneNumber: '5559876543',
      companyName: 'John Doe',
      investorType: InvestorType.INDIVIDUAL,
      status: InvestorStatus.VERIFIED,
      isOptedInNotificationsEmail: true,
      isOptedInNotificationsSMS: false,
      document: buyer2Document,
      bankAccount: buyer2BankAccount,
    });

    investors.push(seller1, seller2, buyer1, buyer2);
    return await this.investorRepository.save(investors);
  }

  private async seedInvoices(investors: Investor[]): Promise<Invoice[]> {
    const invoices: Invoice[] = [];

    // Get only seller investors (individual type) for creating invoices
    const sellerInvestors = investors.filter(
      (inv) => inv.investorType === InvestorType.INDIVIDUAL,
    );

    for (const seller of sellerInvestors) {
      for (let i = 1; i <= 3; i++) {
        const invoiceDocument = await this.documentRepository.save(
          this.documentRepository.create({
            title: `Invoice ${i} - ${seller.companyName}`,
          }),
        );

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30 * i);

        const invoice = this.invoiceRepository.create({
          sellerInvestor: seller,
          document: invoiceDocument,
          debtor: {
            id: `DEBTOR-${Math.floor(Math.random() * 10000)}`,
            companyName: `Client Company ${i}`,
            website: `https://client${i}.com`,
            email: `contact@client${i}.com`,
          },
          amount: 10000 + i * 5000,
          dueDate: dueDate,
          transactionFee: {
            sellerPercentage: 2.5,
            buyerPercentage: 1.5,
          },
          rating: 4.0 + i * 0.3,
        });

        invoices.push(invoice);
      }
    }

    return await this.invoiceRepository.save(invoices);
  }

  private async seedAuctions(invoices: Invoice[]): Promise<Auction[]> {
    const auctions: Auction[] = [];

    for (let i = 0; i < invoices.length; i++) {
      const invoice = invoices[i];

      const auctionDate = new Date();
      auctionDate.setDate(auctionDate.getDate() - 5);

      const dueDate = new Date(invoice.dueDate);

      let status: AuctionStatus;
      if (i % 3 === 0) {
        status = AuctionStatus.ACTIVE;
      } else if (i % 3 === 1) {
        status = AuctionStatus.COMPLETED;
      } else {
        status = AuctionStatus.PENDING;
      }

      const auction = this.auctionRepository.create({
        invoice: invoice,
        discountRate: 3.5 + i * 0.5,
        auctionDate: auctionDate,
        dueDate: dueDate,
        status: status,
      });

      auctions.push(auction);
    }

    return await this.auctionRepository.save(auctions);
  }

  private async seedBids(
    auctions: Auction[],
    investors: Investor[],
  ): Promise<Bid[]> {
    const bids: Bid[] = [];

    // Get only buyer investors (company type) for creating bids
    const buyerInvestors = investors.filter(
      (inv) => inv.investorType === InvestorType.COMPANY,
    );

    for (const auction of auctions) {
      for (let i = 1; i <= 5; i++) {
        const investor = buyerInvestors[i % buyerInvestors.length];

        const bid = this.bidRepository.create({
          auction: auction,
          investor: investor,
          amount: 1000 + i * 500,
        });

        bids.push(bid);
      }
    }

    return await this.bidRepository.save(bids);
  }
}
