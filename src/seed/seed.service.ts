import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import {
  computeDiscount,
  computeProfitability,
} from 'src/app/auction/auction-metrics.util';
import { Auction } from 'src/app/auction/entities/auction.entity';
import { AuctionStatus } from 'src/app/auction/enums/auction-status.enum';
import { BankAccount } from 'src/app/bank-account/entities/bank-account.entity';
import { Bid } from 'src/app/bid/entities/bid.entity';
import { Debtor } from 'src/app/debtor/entities/debtor.entity';
import { DebtorStatus } from 'src/app/debtor/enums/debtor-status.enum';
import { Document } from 'src/app/document/entities/document.entity';
import { DocumentType } from 'src/app/document/enums/document-type.enum';
import { MinioStorageProvider } from 'src/app/document/providers/minio-storage.provider';
import { Invoice } from 'src/app/invoice/entities/invoice.entity';
import { InvoiceStatus } from 'src/app/invoice/enums/invoice-status.enum';
import { Admin } from 'src/app/user/admin/entities/admin.entity';
import { UserType } from 'src/app/user/common/enums/user-type.enum';
import { Investor } from 'src/app/user/investor/entities/investor.entity';
import { InvestorStatus } from 'src/app/user/investor/enums/investor-status.enum';
import { InvestorType } from 'src/app/user/investor/enums/investor-type.enum';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(Investor)
    private readonly investorRepository: Repository<Investor>,
    @InjectRepository(Debtor)
    private readonly debtorRepository: Repository<Debtor>,
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
    private readonly storageService: MinioStorageProvider,
  ) {}

  async run() {
    if (
      process.env.NODE_ENV !== 'development' &&
      process.env.NODE_ENV !== 'local'
    ) {
      console.warn(
        '⚠️ Seeding may only be executed in development environment.',
      );
      return;
    }

    console.log('🌱 Starting database seeding...');

    try {
      console.log('👤 Seeding admins...');
      const admins = await this.seedAdmins();

      console.log('💼 Seeding investors...');
      const investors = await this.seedInvestors();

      console.log('🏢 Seeding debtors...');
      const debtors = await this.seedDebtors(investors);

      console.log('📄 Seeding invoices...');
      const invoices = await this.seedInvoices(investors, debtors);

      console.log('🔨 Seeding auctions...');
      const auctions = await this.seedAuctions(invoices);

      console.log('💰 Seeding bids...');
      const latestBidByAuction = await this.seedBids(auctions, investors);

      console.log('🏆 Assigning buyers to finished auctions...');
      await this.assignBuyersToFinishedInvoices(auctions, latestBidByAuction);

      console.log('💳 Reconciling investor balances...');
      await this.reconcileBalances(auctions, latestBidByAuction, investors);

      const totalBids = [...latestBidByAuction.values()].length;
      console.log('✅ Database seeding completed successfully!');
      console.log(`\t - ${admins.length} admins created`);
      console.log(`\t - ${investors.length} investors created`);
      console.log(`\t - ${debtors.length} debtors created`);
      console.log(`\t - ${invoices.length} invoices created`);
      console.log(`\t - ${auctions.length} auctions created`);
      console.log(`\t - ${totalBids} auctions with bids seeded`);
    } catch (error) {
      console.error('❌ Error seeding database:', error);
      throw error;
    }
  }

  private async seedAdmins(): Promise<Admin[]> {
    const password = bcrypt.hashSync('Admin123!', 10);

    const admins = [
      this.adminRepository.create({
        email: 'admin1@invobid.com',
        password: password,
        name: 'John Administrator',
        type: UserType.ADMIN,
      }),
      this.adminRepository.create({
        email: 'admin2@invobid.com',
        password: password,
        name: 'Jane Admin',
        type: UserType.ADMIN,
      }),
    ];

    return await this.adminRepository.save(admins);
  }

  private async seedInvestors(): Promise<Investor[]> {
    const password = bcrypt.hashSync('Investor123!', 10);
    const investors: Investor[] = [];

    const SEED_DNI_KEY = 'seed-dni.jpg';
    const SEED_NIF_KEY = 'seed-nif.jpg';
    await this.storageService.uploadFile(
      fs.readFileSync(
        path.join(process.cwd(), 'test', 'sample_files', 'dni.jpg'),
      ),
      SEED_DNI_KEY,
    );
    await this.storageService.uploadFile(
      fs.readFileSync(
        path.join(process.cwd(), 'test', 'sample_files', 'nif.jpg'),
      ),
      SEED_NIF_KEY,
    );

    const investorData = [
      {
        name: 'Robert Tech',
        email: 'seller1@techcorp.com',
        phone: '34912345678',
        company: 'TechCorp Solutions',
        type: InvestorType.COMPANY,
        balance: 50000,
        status: InvestorStatus.VERIFIED,
        taxId: '12345678Z',
      },
      {
        name: 'Sarah Global',
        email: 'seller2@globaltrade.com',
        phone: '34923456789',
        company: 'GlobalTrade Industries',
        type: InvestorType.INDIVIDUAL,
        balance: 75000,
        status: InvestorStatus.PENDING,
        taxId: '23456780T',
      },
      {
        name: 'Michael Wealth',
        email: 'buyer1@wealthfund.com',
        phone: '34934567890',
        company: 'WealthFund Capital',
        type: InvestorType.COMPANY,
        balance: 500000,
        status: InvestorStatus.CORRECTION,
        taxId: 'A12345674',
        lastCommunication:
          'El documento de identificación es incorrecto o no es legible',
      },
      {
        name: 'John Doe',
        email: 'buyer2@capitalpartners.com',
        phone: '34945678901',
        company: 'Capital Partners',
        type: InvestorType.INDIVIDUAL,
        balance: 350000,
        status: InvestorStatus.VERIFIED,
        taxId: '34567890V',
      },
      {
        name: 'Emma Johnson',
        email: 'investor3@financeplus.com',
        phone: '34956789012',
        company: 'Finance Plus Ltd',
        type: InvestorType.COMPANY,
        balance: 250000,
        status: InvestorStatus.VERIFIED,
        taxId: 'B12345682',
      },
      {
        name: 'David Smith',
        email: 'investor4@tradeflow.com',
        phone: '34967890123',
        company: 'TradeFlow Inc',
        type: InvestorType.INDIVIDUAL,
        balance: 120000,
        status: InvestorStatus.PENDING,
        taxId: '45678901G',
      },
      {
        name: 'Lisa Anderson',
        email: 'investor5@capitalventure.com',
        phone: '34978901234',
        company: 'Capital Venture Group',
        type: InvestorType.COMPANY,
        balance: 600000,
        status: InvestorStatus.CORRECTION,
        taxId: 'C12345690',
        lastCommunication:
          'No se ha podido verificar la razón social de la empresa',
      },
      {
        name: 'James Wilson',
        email: 'investor6@investpro.com',
        phone: '34989012345',
        company: 'InvestPro Solutions',
        type: InvestorType.INDIVIDUAL,
        balance: 85000,
        status: InvestorStatus.CORRECTION,
        taxId: '56789012B',
        lastCommunication:
          'Se requiere documentación adicional para verificar la identidad',
      },
      {
        name: 'Rachel Brown',
        email: 'investor7@financecore.com',
        phone: '34912345679',
        company: 'FinanceCore Partners',
        type: InvestorType.COMPANY,
        balance: 450000,
        status: InvestorStatus.VERIFIED,
        taxId: 'D12345708',
      },
      {
        name: 'Christopher Lee',
        email: 'investor8@tradehub.com',
        phone: '34923456780',
        company: 'TradeHub Solutions',
        type: InvestorType.INDIVIDUAL,
        balance: 95000,
        status: InvestorStatus.PENDING,
        taxId: 'X1234567L',
      },
      {
        name: 'Patricia Martinez',
        email: 'investor9@wealthmanage.com',
        phone: '34934567891',
        company: 'Wealth Management Corp',
        type: InvestorType.COMPANY,
        balance: 780000,
        status: InvestorStatus.VERIFIED,
        taxId: 'E12345716',
      },
      {
        name: 'Mark Taylor',
        email: 'investor10@finventure.com',
        phone: '34945678902',
        company: 'FinVenture Ltd',
        type: InvestorType.INDIVIDUAL,
        balance: 110000,
        status: InvestorStatus.CORRECTION,
        taxId: '78901234X',
        lastCommunication:
          'El documento de identificación está caducado o no es válido',
      },
      {
        name: 'Jennifer Garcia',
        email: 'investor11@investflow.com',
        phone: '34956789013',
        company: 'InvestFlow Capital',
        type: InvestorType.COMPANY,
        balance: 320000,
        status: InvestorStatus.CORRECTION,
        taxId: 'F12345724',
        lastCommunication:
          'El CIF de la empresa no coincide con los registros oficiales',
      },
      {
        name: 'Anthony Rodriguez',
        email: 'investor12@tradepro.com',
        phone: '34967890124',
        company: 'TradePro Holdings',
        type: InvestorType.INDIVIDUAL,
        balance: 75000,
        status: InvestorStatus.PENDING,
        taxId: 'Y1234567X',
      },
      {
        name: 'Nancy White',
        email: 'investor13@capitalplus.com',
        phone: '34978901235',
        company: 'Capital Plus Ventures',
        type: InvestorType.COMPANY,
        balance: 550000,
        status: InvestorStatus.DENIED,
        taxId: 'G12345732',
        lastCommunication: 'La cuenta ha sido denegada por insolvencia',
      },
      {
        name: 'Steven Harris',
        email: 'investor14@financepro.com',
        phone: '34989012346',
        company: 'FinancePro Advisory',
        type: InvestorType.INDIVIDUAL,
        balance: 130000,
        status: InvestorStatus.VERIFIED,
        taxId: '90123456A',
      },
      {
        name: 'Dorothy Clark',
        email: 'investor15@wealthplus.com',
        phone: '34912345680',
        company: 'WealthPlus Group',
        type: InvestorType.COMPANY,
        balance: 420000,
        status: InvestorStatus.VERIFIED,
        taxId: 'H12345740',
      },
      {
        name: 'Paul Lewis',
        email: 'investor16@investcore.com',
        phone: '34923456781',
        company: 'InvestCore Ltd',
        type: InvestorType.INDIVIDUAL,
        balance: 88000,
        status: InvestorStatus.PENDING,
        taxId: '01234567L',
      },
      {
        name: 'Susan Walker',
        email: 'investor17@tradefin.com',
        phone: '34934567892',
        company: 'TradeFin Solutions',
        type: InvestorType.COMPANY,
        balance: 670000,
        status: InvestorStatus.VERIFIED,
        taxId: 'J12345757',
      },
      {
        name: 'Andrew Hall',
        email: 'investor18@capitalfin.com',
        phone: '34945678903',
        company: 'CapitalFin Partners',
        type: InvestorType.INDIVIDUAL,
        balance: 105000,
        status: InvestorStatus.DENIED,
        taxId: '12345679S',
        lastCommunication:
          'La cuenta ha sido denegada por no cumplir los requisitos de solvencia',
      },
      {
        name: 'Karen Allen',
        email: 'investor19@wealthcore.com',
        phone: '34956789014',
        company: 'WealthCore Advisors',
        type: InvestorType.COMPANY,
        balance: 380000,
        status: InvestorStatus.DENIED,
        taxId: 'U12345765',
        lastCommunication:
          'La documentación aportada no es suficiente para verificar la empresa',
      },
      {
        name: 'Daniel Young',
        email: 'investor20@fintech.com',
        phone: '34967890125',
        company: 'FinTech Ventures',
        type: InvestorType.INDIVIDUAL,
        balance: 92000,
        status: InvestorStatus.PENDING,
        taxId: 'Z1234567R',
      },
      {
        name: 'Betty King',
        email: 'investor21@investplus.com',
        phone: '34978901236',
        company: 'InvestPlus Global',
        type: InvestorType.COMPANY,
        balance: 510000,
        status: InvestorStatus.VERIFIED,
        taxId: 'V12345773',
      },
      {
        name: 'Edward Wright',
        email: 'investor22@tradecap.com',
        phone: '34989012347',
        company: 'TradeCapital Group',
        type: InvestorType.INDIVIDUAL,
        balance: 115000,
        status: InvestorStatus.DENIED,
        taxId: '34567891H',
        lastCommunication: 'No se pudo verificar la identidad del titular',
      },
      {
        name: 'Sandra Lopez',
        email: 'investor23@wealthtrade.com',
        phone: '34912345681',
        company: 'WealthTrade Partners',
        type: InvestorType.COMPANY,
        balance: 690000,
        status: InvestorStatus.DENIED,
        taxId: 'W12345781',
        lastCommunication:
          'La cuenta ha sido denegada por actividad sospechosa',
      },
      {
        name: 'Thomas Hill',
        email: 'investor24@financeway.com',
        phone: '34923456782',
        company: 'FinanceWay Solutions',
        type: InvestorType.INDIVIDUAL,
        balance: 78000,
        status: InvestorStatus.PENDING,
        taxId: '45678902M',
      },
      {
        name: 'Angela Scott',
        email: 'investor25@investglobal.com',
        phone: '34934567893',
        company: 'InvestGlobal Corp',
        type: InvestorType.COMPANY,
        balance: 720000,
        status: InvestorStatus.VERIFIED,
        taxId: 'N12345799',
      },
    ];

    for (const data of investorData) {
      const bankAccount = await this.bankAccountRepository.save({
        balance: data.balance,
        reservedBalance: 0,
      });

      const documentId = uuidv4();
      const document = this.documentRepository.create({
        id: documentId,
        title: `${data.company} NIF/CIF Document`,
        filename:
          data.type === InvestorType.INDIVIDUAL ? SEED_DNI_KEY : SEED_NIF_KEY,
        value: data.taxId,
        type: DocumentType.ID,
      });

      const investor = this.investorRepository.create({
        email: data.email,
        password: password,
        name: data.name,
        type: UserType.INVESTOR,
        phoneNumber: data.phone,
        companyName: data.company,
        investorType: data.type,
        status: data.status,
        taxId: data.taxId,
        isOptedInNotificationsEmail: true,
        isOptedInNotificationsSMS: Math.random() > 0.5,
        lastCommunication: data.lastCommunication || undefined,
        documents: [document],
        bankAccount: bankAccount,
      });

      investors.push(investor);
    }

    return await this.investorRepository.save(investors);
  }

  private async seedDebtors(investors: Investor[]): Promise<Debtor[]> {
    const debtors: Debtor[] = [];
    const nifLetters = 'TRWAGMYFPDXBNJZSQVHLCKE';

    // Only VERIFIED, COMPANY investors can have debtors
    const companyInvestors = investors.filter(
      (inv) =>
        inv.investorType === InvestorType.COMPANY &&
        inv.status === InvestorStatus.VERIFIED,
    );

    const debtorData = [
      {
        companyName: 'Client Company 1',
        email: 'contact@client1.com',
        phoneNumber: '34912345600',
        baseNumber: 12345670,
        status: DebtorStatus.VERIFIED,
      },
      {
        companyName: 'Client Company 2',
        email: 'contact@client2.com',
        phoneNumber: '34912345601',
        baseNumber: 23456781,
        status: DebtorStatus.PENDING,
      },
      {
        companyName: 'Client Company 3',
        email: 'contact@client3.com',
        phoneNumber: '34912345602',
        baseNumber: 34567892,
        status: DebtorStatus.VERIFIED,
      },
      {
        companyName: 'Client Company 4',
        email: 'contact@client4.com',
        phoneNumber: '34912345603',
        baseNumber: 45678903,
        status: DebtorStatus.CORRECTION,
      },
      {
        companyName: 'Client Company 5',
        email: 'contact@client5.com',
        phoneNumber: '34912345604',
        baseNumber: 56789014,
        status: DebtorStatus.VERIFIED,
      },
      {
        companyName: 'Client Company 6',
        email: 'contact@client6.com',
        phoneNumber: '34912345605',
        baseNumber: 67890125,
        status: DebtorStatus.PENDING,
      },
      {
        companyName: 'Client Company 7',
        email: 'contact@client7.com',
        phoneNumber: '34912345606',
        baseNumber: 78901236,
        status: DebtorStatus.DENIED,
      },
      {
        companyName: 'Client Company 8',
        email: 'contact@client8.com',
        phoneNumber: '34912345607',
        baseNumber: 89012347,
        status: DebtorStatus.VERIFIED,
      },
      {
        companyName: 'Client Company 9',
        email: 'contact@client9.com',
        phoneNumber: '34912345608',
        baseNumber: 90123458,
        status: DebtorStatus.CORRECTION,
      },
      {
        companyName: 'Client Company 10',
        email: 'contact@client10.com',
        phoneNumber: '34912345609',
        baseNumber: 11234569,
        status: DebtorStatus.DENIED,
      },
      {
        companyName: 'Client Company 11',
        email: 'contact@client11.com',
        phoneNumber: '34912345610',
        baseNumber: 22345670,
        status: DebtorStatus.VERIFIED,
      },
      {
        companyName: 'Client Company 12',
        email: 'contact@client12.com',
        phoneNumber: '34912345611',
        baseNumber: 33456781,
        status: DebtorStatus.DENIED,
      },
      {
        companyName: 'Client Company 13',
        email: 'contact@client13.com',
        phoneNumber: '34912345612',
        baseNumber: 44567892,
        status: DebtorStatus.VERIFIED,
      },
      {
        companyName: 'Client Company 14',
        email: 'contact@client14.com',
        phoneNumber: '34912345613',
        baseNumber: 55678903,
        status: DebtorStatus.PENDING,
      },
      {
        companyName: 'Client Company 15',
        email: 'contact@client15.com',
        phoneNumber: '34912345614',
        baseNumber: 66789014,
        status: DebtorStatus.CORRECTION,
      },
      {
        companyName: 'Client Company 16',
        email: 'contact@client16.com',
        phoneNumber: '34912345615',
        baseNumber: 77890125,
        status: DebtorStatus.VERIFIED,
      },
      {
        companyName: 'Client Company 17',
        email: 'contact@client17.com',
        phoneNumber: '34912345616',
        baseNumber: 88901236,
        status: DebtorStatus.CORRECTION,
      },
      {
        companyName: 'Client Company 18',
        email: 'contact@client18.com',
        phoneNumber: '34912345617',
        baseNumber: 99012347,
        status: DebtorStatus.DENIED,
      },
      {
        companyName: 'Client Company 19',
        email: 'contact@client19.com',
        phoneNumber: '34912345618',
        baseNumber: 10123458,
        status: DebtorStatus.VERIFIED,
      },
      {
        companyName: 'Client Company 20',
        email: 'contact@client20.com',
        phoneNumber: '34912345619',
        baseNumber: 21234569,
        status: DebtorStatus.DENIED,
      },
      {
        companyName: 'Client Company 21',
        email: 'contact@client21.com',
        phoneNumber: '34912345620',
        baseNumber: 32345670,
        status: DebtorStatus.DENIED,
      },
      {
        companyName: 'Client Company 22',
        email: 'contact@client22.com',
        phoneNumber: '34912345621',
        baseNumber: 43456781,
        status: DebtorStatus.PENDING,
      },
      {
        companyName: 'Client Company 23',
        email: 'contact@client23.com',
        phoneNumber: '34912345622',
        baseNumber: 54567892,
        status: DebtorStatus.CORRECTION,
      },
      {
        companyName: 'Client Company 24',
        email: 'contact@client24.com',
        phoneNumber: '34912345623',
        baseNumber: 65678903,
        status: DebtorStatus.PENDING,
      },
    ];

    for (let i = 0; i < debtorData.length; i++) {
      const data = debtorData[i];
      const investor = companyInvestors[i % companyInvestors.length];
      const controlLetter = nifLetters[data.baseNumber % 23];
      const nif = `${data.baseNumber}${controlLetter}`;
      const debtor = this.debtorRepository.create({
        investor: investor,
        companyName: data.companyName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        taxId: nif,
        status: data.status,
      });
      debtors.push(debtor);
    }
    await this.debtorRepository.save(debtors);

    // const allDocuments: Document[] = [];
    // for (let i = 0; i < savedDebtors.length; i++) {
    //   const debtor = savedDebtors[i];
    //   const data = debtorData[i];
    //   const investor = debtor.investor;
    //   const controlLetter = nifLetters[data.baseNumber % 23];
    //   const nif = `${data.baseNumber}${controlLetter}`;

    //   const document111Quarterly = this.documentRepository.create({
    //     id: uuidv4(),
    //     title: `${data.companyName} 111 quarterly tax document`,
    //     filename: `modelo111.jpg`,
    //     value: nif,
    //     type: DocumentType.TAX_111_QUARTERLY,
    //     investor: investor,
    //     debtor: debtor,
    //   });

    //   const document111Annual = this.documentRepository.create({
    //     id: uuidv4(),
    //     title: `${data.companyName} 111 annual tax document`,
    //     filename: `modelo111_annual.jpg`,
    //     value: nif,
    //     type: DocumentType.TAX_111_ANNUAL,
    //     investor: investor,
    //     debtor: debtor,
    //   });

    //   const document303Quarterly = this.documentRepository.create({
    //     id: uuidv4(),
    //     title: `${data.companyName} 303 quarterly tax document`,
    //     filename: `modelo303.jpg`,
    //     value: nif,
    //     type: DocumentType.TAX_303_QUARTERLY,
    //     investor: investor,
    //     debtor: debtor,
    //   });

    //   const document303Annual = this.documentRepository.create({
    //     id: uuidv4(),
    //     title: `${data.companyName} 303 annual tax document`,
    //     filename: `modelo303_annual.jpg`,
    //     value: nif,
    //     type: DocumentType.TAX_303_ANNUAL,
    //     investor: investor,
    //     debtor: debtor,
    //   });

    //   allDocuments.push(
    //     document111Quarterly,
    //     document111Annual,
    //     document303Quarterly,
    //     document303Annual,
    //   );
    // }
    // await this.documentRepository.save(allDocuments);

    return await this.debtorRepository.find({
      relations: [
        'investor',
        // 'documents'
      ],
    });
  }

  private async seedInvoices(
    investors: Investor[],
    debtors: Debtor[],
  ): Promise<Invoice[]> {
    const invoices: Invoice[] = [];
    const invoiceMetadata: Array<{
      title: string;
      investor: Investor;
    }> = [];

    const SEED_INVOICE_KEY = 'seed-invoice.pdf';
    const pdfBuffer = fs.readFileSync(
      path.join(process.cwd(), 'test', 'sample_files', 'invoice.pdf'),
    );
    await this.storageService.uploadFile(pdfBuffer, SEED_INVOICE_KEY);

    const sellerInvestors = investors.filter(
      (inv) =>
        inv.investorType === InvestorType.COMPANY &&
        inv.status === InvestorStatus.VERIFIED,
    );

    let invoiceIndex = 0;
    // Build a map of verified debtors for each investor
    const verifiedDebtorsByInvestor = new Map<string, Debtor[]>();
    for (const debtor of debtors) {
      if (debtor.status === DebtorStatus.VERIFIED) {
        const investorId = debtor.investor.id;
        if (!verifiedDebtorsByInvestor.has(investorId)) {
          verifiedDebtorsByInvestor.set(investorId, []);
        }
        verifiedDebtorsByInvestor.get(investorId)!.push(debtor);
      }
    }

    console.log(
      `📊 Verified debtors available: ${verifiedDebtorsByInvestor.size} sellers have verified debtors`,
    );
    let skippedSellerCount = 0;
    for (const seller of sellerInvestors) {
      const verifiedCount =
        verifiedDebtorsByInvestor.get(seller.id)?.length || 0;
      if (verifiedCount === 0) {
        skippedSellerCount++;
      }
    }
    if (skippedSellerCount > 0) {
      console.log(
        `⚠️  ${skippedSellerCount} sellers have no verified debtors and will be skipped`,
      );
    }

    // Step 1: Create and save invoices without documents
    for (const seller of sellerInvestors) {
      for (let i = 1; i <= 10; i++) {
        // Set due date to a date between Oct 1 and Dec 31 of 2026
        const targetYear = 2026;
        const month = 9 + (invoiceIndex % 3); // Oct (9), Nov (10), Dec (11)
        const day = 1 + ((invoiceIndex * 2) % 28); // Vary the days
        const dueDate = new Date(targetYear, month, day);

        // Select verified debtor belonging to this seller
        const sellerVerifiedDebtors =
          verifiedDebtorsByInvestor.get(seller.id) || [];
        if (sellerVerifiedDebtors.length === 0) {
          console.warn(
            `⚠️  No verified debtors found for seller ${seller.companyName}. Skipping invoice creation.`,
          );
          continue;
        }
        const debtorIndex = i % sellerVerifiedDebtors.length;
        const debtor = sellerVerifiedDebtors[debtorIndex];

        let status: InvoiceStatus;
        let lastCommunication: string | undefined;

        if (invoiceIndex % 2 === 0) {
          status = InvoiceStatus.VERIFIED;
        } else if (invoiceIndex % 6 === 1) {
          status = InvoiceStatus.PENDING;
        } else if (invoiceIndex % 6 === 3) {
          status = InvoiceStatus.CORRECTION;
          lastCommunication =
            'Se requiere documentación adicional para verificación';
        } else {
          status = InvoiceStatus.DENIED;
          lastCommunication = 'La factura no cumple con los requisitos mínimos';
        }

        const invoiceData: Partial<Invoice> = {
          sellerInvestor: seller,
          debtor: debtor,
          amount: 5000 + Math.random() * 95000,
          dueDate: dueDate,
          status: status,
          transactionFee: {
            sellerPercentage: 2.5,
            buyerPercentage: 1.5,
          },
          rating: 4.0 + i * 0.3,
          extRating: 4.0 + i * 0.28,
          svc: uuidv4(),
        };

        if (lastCommunication) {
          invoiceData.lastCommunication = lastCommunication;
        }

        const invoice = this.invoiceRepository.create(invoiceData);
        invoices.push(invoice);

        invoiceMetadata.push({
          title: `Invoice ${i} - ${seller.companyName}`,
          investor: seller,
        });

        invoiceIndex++;
      }
    }

    const savedInvoices = await this.invoiceRepository.save(invoices);

    // Step 2: Create documents with invoice references and update invoices
    for (let i = 0; i < savedInvoices.length; i++) {
      const savedInvoice = savedInvoices[i];
      const metadata = invoiceMetadata[i];

      const invoiceDocument = this.documentRepository.create({
        id: uuidv4(),
        title: metadata.title,
        filename: SEED_INVOICE_KEY,
        value: uuidv4(),
        investor: metadata.investor,
        invoice: savedInvoice,
        type: DocumentType.INVOICE,
      });

      const savedDocument = await this.documentRepository.save(invoiceDocument);

      savedInvoice.documents = [savedDocument];
      await this.invoiceRepository.save(savedInvoice);
    }

    return savedInvoices;
  }

  private async seedAuctions(invoices: Invoice[]): Promise<Auction[]> {
    const auctions: Auction[] = [];
    const DAY_MS = 24 * 60 * 60 * 1000;
    const now = new Date();

    // Only VERIFIED invoices can be used to create auctions
    const verifiedInvoices = invoices.filter(
      (inv) => inv.status === InvoiceStatus.VERIFIED,
    );

    const statuses = [Object.values(AuctionStatus)].flat();

    for (let i = 0; i < verifiedInvoices.length; i++) {
      const invoice = verifiedInvoices[i];
      const status = statuses[i % statuses.length];

      const durationMs = 15 * 60 * 1000 + Math.random() * 45 * 60 * 1000;

      let auctionDateStart: Date | undefined;
      let auctionDateEnd: Date;

      switch (status) {
        case AuctionStatus.FINISHED:
        case AuctionStatus.CANCELLED: {
          // End already passed (1–23 days ago)
          const endDaysAgo = 1 + Math.floor(Math.random() * 23);
          auctionDateEnd = new Date(now.getTime() - endDaysAgo * DAY_MS);
          auctionDateStart = new Date(auctionDateEnd.getTime() - durationMs);
          // Ending values (price/discount/profitability) are populated after
          // seedBids() runs, using the actual winning bid — matching app behaviour.
          break;
        }
        case AuctionStatus.PUBLISHED:
        case AuctionStatus.TRANSITIONING: {
          // For PUBLISHED: started in the past, end is in the future
          // For TRANSITIONING: started and ended in the past (waiting for admin close)
          // Note: TRANSITIONING auctions do NOT have ending values persisted;
          // they will be set only when explicitly moved to FINISHED status.
          const elapsedMs = Math.random() * durationMs;
          auctionDateStart = new Date(now.getTime() - elapsedMs);
          if (status === AuctionStatus.PUBLISHED) {
            auctionDateEnd = new Date(auctionDateStart.getTime() + durationMs);
          } else {
            // TRANSITIONING: end is in the past
            const endDaysAgo = 1 + Math.floor(Math.random() * 3);
            auctionDateEnd = new Date(
              now.getTime() - endDaysAgo * DAY_MS * 0.5,
            );
            if (auctionDateEnd <= auctionDateStart) {
              auctionDateEnd = new Date(
                auctionDateStart.getTime() + durationMs * 0.1,
              );
            }
            // TRANSITIONING: do not set ending values here; they will be populated
            // only when the auction explicitly transitions to FINISHED
          }
          break;
        }
        default: {
          // DRAFT — auctionDateStart is null (auto-set on publish);
          // end date set 3–32 days from now
          const endDaysAhead = 3 + Math.floor(Math.random() * 30);
          auctionDateEnd = new Date(now.getTime() + endDaysAhead * DAY_MS);
          break;
        }
      }

      // Never exceed the invoice due date
      if (auctionDateEnd >= invoice.dueDate) {
        auctionDateEnd = new Date(invoice.dueDate.getTime() - DAY_MS);
      }

      const startingPrice =
        invoice.amount * (1 - (Math.random() * 0.15 + 0.05));

      const startingDiscount = computeDiscount(invoice.amount, startingPrice);
      const startingProfitability = computeProfitability(
        invoice.amount,
        invoice.transactionFee.buyerPercentage,
        startingPrice,
      );

      const auction = this.auctionRepository.create({
        invoice,
        price: { start: startingPrice },
        discount: { start: startingDiscount },
        profitability: { start: startingProfitability },
        date: { start: auctionDateStart, end: auctionDateEnd },
        status,
      });

      auctions.push(auction);
    }

    return await this.auctionRepository.save(auctions);
  }

  /**
   * Seed bids for every non-DRAFT auction.
   *
   * Constraints enforced (mirrors bid.service.ts):
   * - Only VERIFIED investors may bid.
   * - The invoice seller cannot bid on their own auction.
   * - No investor can outbid themselves (consecutive bids by same investor prevented).
   * - Each bid amount ≥ previous × (1 + SMALLEST_BID_INCREMENT_PERCENTAGE / 100).
   * - Bidder must have sufficient running availableBalance; if not, the next
   *   eligible investor is tried.
   *
   * Returns a map of auctionId → latest bid for downstream use.
   */
  private async seedBids(
    auctions: Auction[],
    investors: Investor[],
  ): Promise<Map<string, Bid>> {
    // All VERIFIED investors can bid (any type), matching @WsAuth([UserType.INVESTOR])
    const verifiedInvestors = investors.filter(
      (inv) => inv.status === InvestorStatus.VERIFIED,
    );

    const smallestIncrement =
      Number(process.env.SMALLEST_BID_INCREMENT_PERCENTAGE ?? 1) / 100;

    // Track each investor's running availableBalance to detect affordability
    const runningBalance = new Map<string, number>(
      verifiedInvestors.map((inv) => [
        inv.id,
        inv.bankAccount.balance - inv.bankAccount.reservedBalance,
      ]),
    );

    // Latest bid per auction — used by assignBuyers and reconcileBalances
    const latestBidByAuction = new Map<string, Bid>();

    // DRAFT auctions have never been published; no bids exist on them
    const biddableAuctions = auctions.filter(
      (a) => a.status !== AuctionStatus.DRAFT,
    );

    for (const auction of biddableAuctions) {
      const sellerId = auction.invoice.sellerInvestor.id;

      // Eligible bidders: VERIFIED, not the seller
      const eligibleBidders = verifiedInvestors.filter(
        (inv) => inv.id !== sellerId,
      );

      if (eligibleBidders.length < 2) {
        console.warn(
          `⚠️  Auction ${auction.id}: fewer than 2 eligible bidders, skipping`,
        );
        continue;
      }

      const buyerPercentage = auction.invoice.transactionFee.buyerPercentage;
      const netInvoice = auction.invoice.amount * (1 - buyerPercentage / 100);

      // Spread 5 bids across a range where profitability stays strictly positive
      const lowerBound = auction.price.start;
      const startProfitability = computeProfitability(
        auction.invoice.amount,
        buyerPercentage,
        lowerBound,
      );
      const profSpread = 0.1 + Math.random() * 0.9;
      const endProfitability = Math.max(0.05, startProfitability - profSpread);
      const upperBound = netInvoice / (1 + endProfitability / 100);
      const spread = upperBound - lowerBound;
      const step = spread / 6; // 6 steps → use steps 1–5

      let previousAmount = lowerBound;
      let previousBidderId: string | null = null;
      let bidderRotation = 0;

      for (let i = 1; i <= 5; i++) {
        const noise = step * (Math.random() * 0.1 - 0.05);
        // Ensure minimum increment over the previous bid
        const minAmount = previousAmount * (1 + smallestIncrement);
        const rawAmount = lowerBound + step * i + noise;
        const amount = Math.max(rawAmount, minAmount);

        // Pick an eligible bidder who isn't the previous bidder (realistic)
        // and has enough balance. Try up to eligibleBidders.length candidates.
        let investor: Investor | undefined;
        for (let attempt = 0; attempt < eligibleBidders.length; attempt++) {
          const candidate =
            eligibleBidders[
              (bidderRotation + attempt) % eligibleBidders.length
            ];

          // Don't let the same investor outbid themselves
          if (candidate.id === previousBidderId) continue;

          // Check running balance
          const available = runningBalance.get(candidate.id) ?? 0;
          if (available >= amount) {
            investor = candidate;
            bidderRotation =
              (bidderRotation + attempt + 1) % eligibleBidders.length;
            break;
          }
        }

        if (!investor) {
          console.warn(
            `⚠️  Auction ${auction.id} bid #${i}: no eligible investor with sufficient balance, stopping at ${i - 1} bids`,
          );
          break;
        }

        // Release the previous bidder's reservation (they've been outbid)
        if (previousBidderId) {
          const prev = runningBalance.get(previousBidderId) ?? 0;
          runningBalance.set(previousBidderId, prev + previousAmount);
        }

        // Reserve the new bidder's funds
        const currentBalance = runningBalance.get(investor.id)!;
        runningBalance.set(investor.id, currentBalance - amount);

        const bid = this.bidRepository.create({
          auction,
          investor,
          amount,
          discount: computeDiscount(auction.invoice.amount, amount),
          profitability: computeProfitability(
            auction.invoice.amount,
            buyerPercentage,
            amount,
          ),
        });

        // Save individually so each bid gets a distinct createdAt timestamp,
        // ensuring chronological order reflects ascending bid amounts.
        const savedBid = await this.bidRepository.save(bid);

        latestBidByAuction.set(auction.id, savedBid);
        previousAmount = amount;
        previousBidderId = investor.id;
      }
    }

    return latestBidByAuction;
  }

  /**
   * For each FINISHED auction: set invoice.buyerInvestor to the winning bidder,
   * and persist the auction's ending price/discount/profitability from that bid —
   * mirroring what auction.service.ts does when an admin transitions to FINISHED.
   */
  private async assignBuyersToFinishedInvoices(
    auctions: Auction[],
    latestBidByAuction: Map<string, Bid>,
  ): Promise<void> {
    const finishedAuctions = auctions.filter(
      (a) => a.status === AuctionStatus.FINISHED,
    );

    for (const auction of finishedAuctions) {
      const winningBid = latestBidByAuction.get(auction.id);
      if (!winningBid) {
        console.warn(
          `⚠️  FINISHED auction ${auction.id} has no bids — skipping buyer assignment`,
        );
        continue;
      }

      await this.invoiceRepository.update(auction.invoice.id, {
        buyerInvestor: { id: winningBid.investor.id },
      });

      await this.auctionRepository.update(auction.id, {
        price: { start: auction.price.start, end: Number(winningBid.amount) },
        discount: {
          start: auction.discount.start,
          end: Number(winningBid.discount),
        },
        profitability: {
          start: auction.profitability.start,
          end: Number(winningBid.profitability),
        },
      });
    }
  }

  /**
   * Reconcile every investor's bank account balances after bids are seeded,
   * mirroring the transactional effects of placing bids in the live app:
   *
   *  PUBLISHED / TRANSITIONING: winning bidder has funds reserved
   *    → availableBalance -= latestBid.amount
   *  FINISHED: winning bidder's transfer was finalised
   *    → balance -= latestBid.amount  (availableBalance already reduced by reserve)
   *  CANCELLED / DRAFT: no net effect (reserves released / no bids)
   *
   * If the computed availableBalance would go negative the investor's initial
   * balance is increased to cover the shortfall, and a warning is logged.
   */
  private async reconcileBalances(
    auctions: Auction[],
    latestBidByAuction: Map<string, Bid>,
    investors: Investor[],
  ): Promise<void> {
    // Per-investor accumulation
    const reservedMap = new Map<string, number>(); // for PUBLISHED / TRANSITIONING
    const finalizedMap = new Map<string, number>(); // for FINISHED

    for (const auction of auctions) {
      const latestBid = latestBidByAuction.get(auction.id);
      if (!latestBid) continue;

      const investorId = latestBid.investor.id;
      const amount = Number(latestBid.amount);

      if (
        auction.status === AuctionStatus.PUBLISHED ||
        auction.status === AuctionStatus.TRANSITIONING
      ) {
        reservedMap.set(
          investorId,
          (reservedMap.get(investorId) ?? 0) + amount,
        );
      } else if (auction.status === AuctionStatus.FINISHED) {
        finalizedMap.set(
          investorId,
          (finalizedMap.get(investorId) ?? 0) + amount,
        );
      }
      // CANCELLED / DRAFT: reserves released or never created — no net change
    }

    for (const investor of investors) {
      const reserved = reservedMap.get(investor.id) ?? 0;
      const finalized = finalizedMap.get(investor.id) ?? 0;

      if (reserved === 0 && finalized === 0) continue;

      const initialBalance = Number(investor.bankAccount.balance);
      const newBalance = initialBalance - finalized;

      // Check if the resulting reservedBalance would cause issues
      if (reserved > newBalance) {
        console.warn(
          `⚠️  ${investor.email} has ${reserved.toFixed(2)} in reserved bids but only ${newBalance.toFixed(2)} balance after finalized auctions. ` +
            `This may indicate a data consistency issue.`,
        );
      }

      await this.bankAccountRepository.update(investor.bankAccount.id, {
        balance: newBalance,
        reservedBalance: reserved,
      });
    }
  }
}
