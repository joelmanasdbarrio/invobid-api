import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Auction } from 'src/app/auction/entities/auction.entity';
import { AuctionStatus } from 'src/app/auction/enum/auction-status.enum';
import { BankAccount } from 'src/app/bank-account/entities/bank-account.entity';
import { Bid } from 'src/app/bid/entities/bid.entity';
import { Debtor } from 'src/app/debtor/entities/debtor.entity';
import { DebtorStatus } from 'src/app/debtor/enums/debtor-status.enum';
import { Document } from 'src/app/document/entities/document.entity';
import { DocumentType } from 'src/app/document/enums/document-type.enum';
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
  ) {}

  async run() {
    console.log('🌱 Starting database seeding...');

    try {
      await this.clearDatabase();

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
      await this.seedBids(auctions, investors);

      console.log('✅ Database seeding completed successfully!');
      console.log(`\t - ${admins.length} admins created`);
      console.log(`\t - ${investors.length} investors created`);
      console.log(`\t - ${debtors.length} debtors created`);
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
      await this.bidRepository.query('TRUNCATE TABLE "bids" CASCADE');
      await this.auctionRepository.query('TRUNCATE TABLE "auctions" CASCADE');
      await this.invoiceRepository.query('TRUNCATE TABLE "invoices" CASCADE');
      await this.documentRepository.query('TRUNCATE TABLE "documents" CASCADE');
      await this.debtorRepository.query('TRUNCATE TABLE "debtors" CASCADE');
      await this.bankAccountRepository.query(
        'TRUNCATE TABLE "bank_accounts" CASCADE',
      );
      await this.adminRepository.query('TRUNCATE TABLE "users" CASCADE');
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
        status: InvestorStatus.VERIFIED,
        taxId: '56789012B',
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
        status: InvestorStatus.VERIFIED,
        taxId: '78901234X',
      },
      {
        name: 'Jennifer Garcia',
        email: 'investor11@investflow.com',
        phone: '34956789013',
        company: 'InvestFlow Capital',
        type: InvestorType.COMPANY,
        balance: 320000,
        status: InvestorStatus.VERIFIED,
        taxId: 'F12345724',
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
        status: InvestorStatus.VERIFIED,
        taxId: '12345679S',
      },
      {
        name: 'Karen Allen',
        email: 'investor19@wealthcore.com',
        phone: '34956789014',
        company: 'WealthCore Advisors',
        type: InvestorType.COMPANY,
        balance: 380000,
        status: InvestorStatus.VERIFIED,
        taxId: 'U12345765',
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
        status: InvestorStatus.VERIFIED,
        taxId: '34567891H',
      },
      {
        name: 'Sandra Lopez',
        email: 'investor23@wealthtrade.com',
        phone: '34912345681',
        company: 'WealthTrade Partners',
        type: InvestorType.COMPANY,
        balance: 690000,
        status: InvestorStatus.VERIFIED,
        taxId: 'W12345781',
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
      const bankAccount = this.bankAccountRepository.create({
        balance: data.balance,
      });

      const documentId = uuidv4();
      const document = this.documentRepository.create({
        id: documentId,
        title: `${data.company} NIF/CIF Document`,
        filename: data.type === InvestorType.INDIVIDUAL ? `dni.jpg` : `cif.jpg`,
        value: data.taxId,
        type: DocumentType.IDENTIFICATION,
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

    // Only COMPANY investors can have debtors
    const companyInvestors = investors.filter(
      (inv) => inv.investorType === InvestorType.COMPANY,
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
        status: DebtorStatus.PENDING,
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
        status: DebtorStatus.PENDING,
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
        status: DebtorStatus.PENDING,
      },
      {
        companyName: 'Client Company 22',
        email: 'contact@client22.com',
        phoneNumber: '34912345621',
        baseNumber: 43456781,
        status: DebtorStatus.VERIFIED,
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
        status: DebtorStatus.VERIFIED,
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
    const savedDebtors = await this.debtorRepository.save(debtors);

    const allDocuments: Document[] = [];
    for (let i = 0; i < savedDebtors.length; i++) {
      const debtor = savedDebtors[i];
      const data = debtorData[i];
      const investor = debtor.investor;
      const controlLetter = nifLetters[data.baseNumber % 23];
      const nif = `${data.baseNumber}${controlLetter}`;

      const document111 = this.documentRepository.create({
        id: uuidv4(),
        title: `${data.companyName} 111 tax document`,
        filename: `modelo111.jpg`,
        value: nif,
        type: DocumentType.MODELO_111,
        investor: investor,
        debtor: debtor,
      });

      const document303 = this.documentRepository.create({
        id: uuidv4(),
        title: `${data.companyName} 303 tax document`,
        filename: `modelo303.jpg`,
        value: nif,
        type: DocumentType.MODELO_303,
        investor: investor,
        debtor: debtor,
      });

      allDocuments.push(document111, document303);
    }
    await this.documentRepository.save(allDocuments);

    return await this.debtorRepository.find({
      relations: ['documents', 'documents', 'investor'],
    });
  }

  private async seedInvoices(
    investors: Investor[],
    debtors: Debtor[],
  ): Promise<Invoice[]> {
    const invoices: any[] = [];

    const sellerInvestors = investors.filter(
      (inv) => inv.investorType === InvestorType.COMPANY,
    );

    const allInvestors = investors;
    let debtorIndex = 0;
    let invoiceIndex = 0;

    for (const seller of sellerInvestors) {
      for (let i = 1; i <= 3; i++) {
        const documentId = uuidv4();
        const invoiceDocument = this.documentRepository.create({
          id: documentId,
          title: `Invoice ${i} - ${seller.companyName}`,
          filename: `${documentId}.pdf`,
          value: `documents/invoice-${i}-${seller.companyName.toLowerCase().replace(/\s+/g, '-')}.pdf`,
          investor: seller,
          type: DocumentType.INVOICE,
        });

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30 * i);

        // Cycle through available debtors
        const debtor = debtors[debtorIndex % debtors.length];
        debtorIndex++;

        // Determine invoice status and buyer based on invoice index
        let status: InvoiceStatus;
        let buyerInvestor: Investor | undefined;
        let lastCommunication: string | undefined;

        if (invoiceIndex % 4 === 0) {
          status = InvoiceStatus.VERIFIED;
          // VERIFIED invoices usually have buyers - mix of COMPANY and INDIVIDUAL
          buyerInvestor =
            allInvestors[(invoiceIndex * 3) % allInvestors.length];
        } else if (invoiceIndex % 4 === 1) {
          status = InvoiceStatus.PENDING;
          // PENDING invoices may or may not have buyers
          if (invoiceIndex % 2 === 0) {
            buyerInvestor =
              allInvestors[(invoiceIndex * 5) % allInvestors.length];
          }
        } else if (invoiceIndex % 4 === 2) {
          status = InvoiceStatus.CORRECTION;
          // CORRECTION invoices with communication message
          lastCommunication =
            'Se requiere documentación adicional para verificación';
        } else {
          status = InvoiceStatus.DENIED;
          // DENIED invoices with rejection reason
          lastCommunication = 'La factura no cumple con los requisitos mínimos';
        }

        const invoiceData: any = {
          sellerInvestor: seller,
          document: invoiceDocument,
          debtor: debtor,
          amount: 10000 + i * 5000,
          dueDate: dueDate,
          status: status,
          transactionFee: {
            sellerPercentage: 2.5,
            buyerPercentage: 1.5,
          },
          rating: 4.0 + i * 0.3,
        };

        if (buyerInvestor) {
          invoiceData.buyerInvestor = buyerInvestor;
        }

        if (lastCommunication) {
          invoiceData.lastCommunication = lastCommunication;
        }

        const invoice = this.invoiceRepository.create(invoiceData);
        invoices.push(invoice);
        invoiceIndex++;
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
