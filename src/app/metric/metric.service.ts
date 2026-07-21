import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Auction } from 'src/app/auction/entities/auction.entity';
import { AuctionStatus } from 'src/app/auction/enums/auction-status.enum';
import { BankAccount } from 'src/app/bank-account/entities/bank-account.entity';
import { Bid } from 'src/app/bid/entities/bid.entity';
import { Debtor } from 'src/app/debtor/entities/debtor.entity';
import { DebtorStatus } from 'src/app/debtor/enums/debtor-status.enum';
import { Invoice } from 'src/app/invoice/entities/invoice.entity';
import { InvoiceStatus } from 'src/app/invoice/enums/invoice-status.enum';
import { User } from 'src/app/user/common/entities/user.entity';
import { Investor } from 'src/app/user/investor/entities/investor.entity';
import { InvestorStatus } from 'src/app/user/investor/enums/investor-status.enum';
import { Repository } from 'typeorm';

export enum MetricType {
  // Start::Individual
  ACCOUNT_BALANCE = 'i1', // ✅
  TOTAL_INVESTED_VOLUME = 'i2', // ✅
  TOTAL_INVESTED_COUNT = 'i3', // ✅
  INVESTED_PENDING_VOLUME = 'i4', // 🔁
  WEIGHTED_AVERAGE_PROFITABILITY = 'i5', // ✅
  WEIGHTED_YEARLY_PROFITABILITY = 'i6', // ✅
  NEXT_YEAR_EXPECTED_PROFITABILITY = 'i7', // ✅
  EXPECTED_REALIZED_PROFITABILITY = 'i8', // 🔁
  PARTICIPATED_AUCTIONS_COUNT = 'i9', // ✅
  AUCTION_SUCCESS_RATE = 'i10', // ✅
  UPCOMING_DUE_INVOICES = 'i11', // ✅
  OVERDUE_PENDING_INVOICES = 'i12', // 🔁
  AVERAGE_DELAY = 'i13', // 🔁
  RISK_DISTRIBUTION = 'i14', // ✅
  WEIGHTED_AVERAGE_RISK = 'i15', // ✅
  TOP_DEBTORS = 'i16', // ✅
  PORTFOLIO_DIVERSIFICATION = 'i17', // ✅
  MONTHLY_INVESTED_HISTORY = 'i18', // 🔁
  MONTHLY_PROFITABILITY_HISTORY = 'i19', // 🔁
  // End::Individual
  // Start::Company
  COMPANY_INVOICES_BY_STATUS = 'c1', // ✅
  COMPANY_PUBLISHED_INVOICES_VOLUME = 'c2', // ✅
  COMPANY_FINANCED_OWN_INVOICES_VOLUME = 'c3', // ✅
  COMPANY_PENDING_VALIDATION_INVOICES = 'c4', // ✅
  COMPANY_ACTIVE_OWN_AUCTIONS = 'c5', // ✅
  COMPANY_OWN_AUCTIONS_BY_STATUS = 'c6', // ✅
  COMPANY_RECEIVED_BIDS = 'c7', // ✅
  COMPANY_AVERAGE_FINANCING_COST = 'c8', // ✅
  COMPANY_ESTIMATED_SELLER_FEES = 'c9', // ✅
  COMPANY_DEBTORS_BY_STATUS = 'c10', // ✅
  COMPANY_DOCUMENTS_PER_INVOICE = 'c11', // ✅
  COMPANY_AVERAGE_TIME_TO_FINANCE = 'c12', // ✅
  COMPANY_INVESTOR_ACTIVITY = 'c13', // ✅
  // End::Company
  // Start::Admin
  ADMIN_USERS_BY_STATUS_AND_TYPE = 'a1', // ✅
  ADMIN_USERS_PENDING_VALIDATION = 'a2', // ✅
  ADMIN_DEBTORS_BY_STATUS = 'a3', // ✅
  ADMIN_DEBTORS_PENDING_VALIDATION = 'a4', // ✅
  ADMIN_INVOICES_BY_STATUS = 'a5', // ✅
  ADMIN_INVOICES_PENDING_VALIDATION = 'a6', // ✅
  ADMIN_AUCTIONS_BY_STATUS = 'a7', // ✅
  ADMIN_AUCTIONS_IN_TRANSITION = 'a8', // ✅
  ADMIN_PLATFORM_TOTAL_FINANCED_VOLUME = 'a9', // ✅
  ADMIN_ESTIMATED_PLATFORM_FEES = 'a10', // ✅
  ADMIN_ACTIVE_INVESTORS = 'a11', // ✅
  ADMIN_AUCTION_TO_FINANCE_CONVERSION = 'a12', // ✅
  ADMIN_MONTHLY_FINANCED_VOLUME = 'a13', // ✅
  ADMIN_OVERDUE_PENDING_INVOICES = 'a14', // ✅
  ADMIN_PLATFORM_RISK_DISTRIBUTION = 'a15', // ✅
  ADMIN_TOP_DEBTORS_BY_EXPOSURE = 'a16', // ✅
  ADMIN_AGGREGATED_BANK_ACCOUNT_BALANCES = 'a17', // ✅
  ADMIN_AVERAGE_VALIDATION_TIME = 'a18', // 🔁
  // End::Admin
}

@Injectable()
export class MetricService {
  constructor(
    @InjectRepository(BankAccount)
    private readonly bankAccountRepository: Repository<BankAccount>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Bid)
    private readonly bidRepository: Repository<Bid>,
    @InjectRepository(Investor)
    private readonly investorRepository: Repository<Investor>,
    @InjectRepository(Debtor)
    private readonly debtorRepository: Repository<Debtor>,
    @InjectRepository(Auction)
    private readonly auctionRepository: Repository<Auction>,
  ) {}

  get(id: MetricType, user: User) {
    switch (id) {
      // Start::Individual
      case MetricType.ACCOUNT_BALANCE:
        return this.getAvailableFunds(user);
      case MetricType.TOTAL_INVESTED_VOLUME:
        return this.getTotalInvestedVolume(user);
      case MetricType.TOTAL_INVESTED_COUNT:
        return this.getTotalInvestedCount(user);
      case MetricType.WEIGHTED_AVERAGE_PROFITABILITY:
        return this.getWeightedAverageProfitability(user);
      case MetricType.WEIGHTED_YEARLY_PROFITABILITY:
        return this.getWeightedYearlyProfitability(user);
      case MetricType.NEXT_YEAR_EXPECTED_PROFITABILITY:
        return this.getNextYearExpectedProfitability(user);
      case MetricType.PARTICIPATED_AUCTIONS_COUNT:
        return this.getParticipatedAuctionsCount(user);
      case MetricType.AUCTION_SUCCESS_RATE:
        return this.getAuctionSuccessRate(user);
      case MetricType.UPCOMING_DUE_INVOICES:
        return this.getUpcomingDueInvoices(user);
      case MetricType.RISK_DISTRIBUTION:
        return this.getRiskDistribution(user);
      case MetricType.WEIGHTED_AVERAGE_RISK:
        return this.getWeightedAverageRisk(user);
      case MetricType.TOP_DEBTORS:
        return this.getTopDebtors(user);
      case MetricType.PORTFOLIO_DIVERSIFICATION:
        return this.getPortfolioDiversification(user);
      // End::Individual
      // Start::Company
      case MetricType.COMPANY_INVOICES_BY_STATUS:
        return this.getCompanyInvoicesByStatus(user);
      case MetricType.COMPANY_PUBLISHED_INVOICES_VOLUME:
        return this.getCompanyPublishedInvoicesVolume(user);
      case MetricType.COMPANY_FINANCED_OWN_INVOICES_VOLUME:
        return this.getCompanyFinancedOwnInvoicesVolume(user);
      case MetricType.COMPANY_PENDING_VALIDATION_INVOICES:
        return this.getCompanyPendingValidationInvoices(user);
      case MetricType.COMPANY_ACTIVE_OWN_AUCTIONS:
        return this.getCompanyActiveOwnAuctions(user);
      case MetricType.COMPANY_OWN_AUCTIONS_BY_STATUS:
        return this.getCompanyOwnAuctionsByStatus(user);
      case MetricType.COMPANY_RECEIVED_BIDS:
        return this.getCompanyReceivedBids(user);
      case MetricType.COMPANY_AVERAGE_FINANCING_COST:
        return this.getCompanyAverageFinancingCost(user);
      case MetricType.COMPANY_ESTIMATED_SELLER_FEES:
        return this.getCompanyEstimatedSellerFees(user);
      case MetricType.COMPANY_DEBTORS_BY_STATUS:
        return this.getCompanyDebtorsByStatus(user);
      case MetricType.COMPANY_DOCUMENTS_PER_INVOICE:
        return this.getCompanyDocumentsPerInvoice(user);
      case MetricType.COMPANY_AVERAGE_TIME_TO_FINANCE:
        return this.getCompanyAverageTimeToFinance(user);
      case MetricType.COMPANY_INVESTOR_ACTIVITY:
        return this.getCompanyInvestorActivity(user);
      // End::Company
      // Start::Admin
      case MetricType.ADMIN_USERS_BY_STATUS_AND_TYPE:
        return this.getAdminUsersByStatusAndType();
      case MetricType.ADMIN_USERS_PENDING_VALIDATION:
        return this.getAdminUsersPendingValidation();
      case MetricType.ADMIN_DEBTORS_BY_STATUS:
        return this.getAdminDebtorsByStatus();
      case MetricType.ADMIN_DEBTORS_PENDING_VALIDATION:
        return this.getAdminDebtorsPendingValidation();
      case MetricType.ADMIN_INVOICES_BY_STATUS:
        return this.getAdminInvoicesByStatus();
      case MetricType.ADMIN_INVOICES_PENDING_VALIDATION:
        return this.getAdminInvoicesPendingValidation();
      case MetricType.ADMIN_AUCTIONS_BY_STATUS:
        return this.getAdminAuctionsByStatus();
      case MetricType.ADMIN_AUCTIONS_IN_TRANSITION:
        return this.getAdminAuctionsInTransition();
      case MetricType.ADMIN_PLATFORM_TOTAL_FINANCED_VOLUME:
        return this.getAdminPlatformTotalFinancedVolume();
      case MetricType.ADMIN_ESTIMATED_PLATFORM_FEES:
        return this.getAdminEstimatedPlatformFees();
      case MetricType.ADMIN_ACTIVE_INVESTORS:
        return this.getAdminActiveInvestors();
      case MetricType.ADMIN_AUCTION_TO_FINANCE_CONVERSION:
        return this.getAdminAuctionToFinanceConversion();
      case MetricType.ADMIN_MONTHLY_FINANCED_VOLUME:
        return this.getAdminMonthlyFinancedVolume();
      case MetricType.ADMIN_OVERDUE_PENDING_INVOICES:
        return this.getAdminOverduePendingInvoices();
      case MetricType.ADMIN_PLATFORM_RISK_DISTRIBUTION:
        return this.getAdminPlatformRiskDistribution();
      case MetricType.ADMIN_TOP_DEBTORS_BY_EXPOSURE:
        return this.getAdminTopDebtorsByExposure();
      case MetricType.ADMIN_AGGREGATED_BANK_ACCOUNT_BALANCES:
        return this.getAdminAggregatedBankAccountBalances();
      // End::Admin
    }
  }

  // Start::Individual
  private async getAvailableFunds(user: User) {
    const bankAccount = await this.bankAccountRepository
      .createQueryBuilder('bankAccount')
      .leftJoinAndSelect('bankAccount.investor', 'investor')
      .where('investor.id = :investorId', { investorId: user.id })
      .getOne();

    if (bankAccount?.investor.id !== user.id) {
      throw new NotFoundException('Bank account not found for this user');
    }

    const balance = Number(bankAccount.balance);
    const reserved = Number(bankAccount.reservedBalance);

    return {
      availableBalance: Number((balance - reserved).toFixed(2)),
      reservedBalance: Number(reserved.toFixed(2)),
    };
  }

  private async getTotalInvestedVolume(user: User) {
    const result = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('COALESCE(SUM(invoice.amount), 0)', 'totalInvestedVolume')
      .andWhere('invoice.buyerInvestor.id = :investorId', {
        investorId: user.id,
      })
      .getRawOne<{ totalInvestedVolume: string }>();

    return Number(result?.totalInvestedVolume ?? 0);
  }

  private async getTotalInvestedCount(user: User) {
    const result = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('COUNT(invoice.id)', 'totalInvestedCount')
      .andWhere('invoice.buyerInvestor.id = :investorId', {
        investorId: user.id,
      })
      .getRawOne<{ totalInvestedCount: string }>();

    return Number(result?.totalInvestedCount ?? 0);
  }

  private async getWeightedAverageProfitability(user: User) {
    const result = await this.bidRepository
      .createQueryBuilder('bid')
      .innerJoinAndSelect('bid.auction', 'auction')
      .leftJoinAndSelect('auction.invoice', 'invoice')
      .select(
        `COALESCE(
      SUM(bid.amount * bid.profitability) / NULLIF(SUM(bid.amount), 0),
      0
    )`,
        'weightedAverageProfitability',
      )
      .where('bid.investor.id = :investorId', { investorId: user.id })
      .andWhere('invoice.buyerInvestor.id = :investorId', {
        investorId: user.id,
      })
      .andWhere(
        `bid.id = (
          SELECT b.id FROM bids b
          WHERE b."auctionId" = bid."auctionId"
            AND b."investorId" = bid."investorId"
          ORDER BY b."createdAt" DESC
          LIMIT 1
        )`,
      )
      .getRawOne<{ weightedAverageProfitability?: string }>();

    return Number(result?.weightedAverageProfitability ?? 0);
  }

  private async getWeightedYearlyProfitability(user: User) {
    const result = await this.bidRepository
      .createQueryBuilder('bid')
      .innerJoinAndSelect('bid.auction', 'auction')
      .leftJoinAndSelect('auction.invoice', 'invoice')
      .select(
        `COALESCE(
          SUM(bid.amount * bid.profitability) / NULLIF(SUM(bid.amount), 0),
          0
        )`,
        'weightedYearlyProfitability',
      )
      .where('bid.investor.id = :investorId', { investorId: user.id })
      .andWhere('invoice.buyerInvestor.id = :investorId', {
        investorId: user.id,
      })
      .andWhere(
        `invoice.updatedAt >= :yearStart AND invoice.updatedAt < :yearEnd`,
        {
          yearStart: new Date(new Date().getFullYear(), 0, 1),
          yearEnd: new Date(new Date().getFullYear() + 1, 0, 1),
        },
      )
      .andWhere(
        `bid.id = (
          SELECT b.id FROM bids b
          WHERE b."auctionId" = bid."auctionId"
            AND b."investorId" = bid."investorId"
          ORDER BY b."createdAt" DESC
          LIMIT 1
        )`,
      )
      .getRawOne<{ weightedYearlyProfitability?: string }>();

    return Number(result?.weightedYearlyProfitability ?? 0);
  }

  private async getNextYearExpectedProfitability(user: User) {
    const currentYear = new Date().getFullYear();
    const nextYearStart = `${currentYear + 1}-01-01`;
    const nextYearEnd = `${currentYear + 2}-01-01`;

    const result = await this.bidRepository
      .createQueryBuilder('bid')
      .innerJoinAndSelect('bid.auction', 'auction')
      .leftJoinAndSelect('auction.invoice', 'invoice')
      .select(
        `COALESCE(
          SUM(bid.amount * bid.profitability) / NULLIF(SUM(bid.amount), 0),
          0
        )`,
        'nextYearExpectedProfitability',
      )
      .where('bid.investor.id = :investorId', { investorId: user.id })
      .andWhere('invoice.buyerInvestor.id = :investorId', {
        investorId: user.id,
      })
      .andWhere(
        'invoice.dueDate >= :nextYearStart AND invoice.dueDate < :nextYearEnd',
        {
          nextYearStart,
          nextYearEnd,
        },
      )
      .andWhere(
        `bid.id = (
          SELECT b.id FROM bids b
          WHERE b."auctionId" = bid."auctionId"
            AND b."investorId" = bid."investorId"
          ORDER BY b."createdAt" DESC
          LIMIT 1
        )`,
      )
      .getRawOne<{ nextYearExpectedProfitability?: string }>();

    return Number(result?.nextYearExpectedProfitability ?? 0);
  }

  private async getParticipatedAuctionsCount(user: User) {
    const result = await this.bidRepository
      .createQueryBuilder('bid')
      .innerJoinAndSelect('bid.auction', 'auction')
      .select('COUNT(DISTINCT auction.id)', 'participatedCount')
      .where('bid.investor.id = :investorId', { investorId: user.id })
      .getRawOne<{ participatedCount: string }>();

    return Number(result?.participatedCount ?? 0);
  }

  private async getAuctionSuccessRate(user: User) {
    const participatedResult = await this.bidRepository
      .createQueryBuilder('bid')
      .innerJoinAndSelect('bid.auction', 'auction')
      .select('COUNT(DISTINCT auction.invoiceId)', 'participatedCount')
      .where('bid.investor.id = :investorId', { investorId: user.id })
      .getRawOne<{ participatedCount: string }>();

    const acquiredResult = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('COUNT(invoice.id)', 'acquiredCount')
      .where('invoice.buyerInvestor.id = :investorId', {
        investorId: user.id,
      })
      .getRawOne<{ acquiredCount: string }>();

    const participated = Number(participatedResult?.participatedCount ?? 0);
    const acquired = Number(acquiredResult?.acquiredCount ?? 0);

    if (participated === 0) return 0;
    return Number((acquired / participated) * 100).toFixed(2);
  }

  private async getUpcomingDueInvoices(user: User) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const result = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.debtor', 'debtor')
      .leftJoin('invoice.buyerInvestor', 'buyerInvestor')
      .select('invoice.id', 'id')
      .addSelect('invoice.svc', 'svc')
      .addSelect('invoice.amount', 'amount')
      .addSelect('invoice.dueDate', 'dueDate')
      .addSelect('invoice.currency', 'currency')
      .addSelect('debtor.companyName', 'debtorCompanyName')
      .where('buyerInvestor.id = :investorId', {
        investorId: user.id,
      })
      .andWhere('invoice.dueDate >= :today', { today })
      .andWhere('invoice.dueDate <= :thirtyDaysLater', { thirtyDaysLater })
      .orderBy('invoice.dueDate', 'ASC')
      .getRawMany<{
        id: string;
        svc: string;
        amount: string;
        dueDate: Date;
        currency: string;
        debtorCompanyName: string;
      }>();

    return result;
  }

  private async getRiskDistribution(user: User) {
    const result = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('invoice.rating', 'rating')
      .addSelect('COUNT(invoice.id)', 'invoiceCount')
      .addSelect('COALESCE(SUM(invoice.amount), 0)', 'totalAmount')
      .where('invoice.buyerInvestor.id = :investorId', {
        investorId: user.id,
      })
      .andWhere('invoice.rating IS NOT NULL')
      .groupBy('invoice.rating')
      .orderBy('invoice.rating', 'ASC')
      .getRawMany<{
        rating: string;
        invoiceCount: string;
        totalAmount: string;
      }>();

    return result.map((row) => ({
      rating: Number(row.rating),
      invoiceCount: Number(row.invoiceCount),
      totalAmount: Number(row.totalAmount),
    }));
  }

  private async getWeightedAverageRisk(user: User) {
    const result = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select(
        'COALESCE(SUM(invoice.rating * invoice.amount) / NULLIF(SUM(invoice.amount), 0), 0)',
        'weightedAverageRisk',
      )
      .where('invoice.buyerInvestor.id = :investorId', {
        investorId: user.id,
      })
      .andWhere('invoice.rating IS NOT NULL')
      .getRawOne<{ weightedAverageRisk: string }>();

    return Number(result?.weightedAverageRisk ?? 0);
  }

  private async getTopDebtors(user: User) {
    const result = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.debtor', 'debtor')
      .select('debtor.id', 'debtorId')
      .addSelect('debtor.companyName', 'companyName')
      .addSelect('COUNT(invoice.id)', 'invoiceCount')
      .addSelect('COALESCE(SUM(invoice.amount), 0)', 'totalAmount')
      .addSelect('COALESCE(AVG(invoice.rating), 0)', 'averageRating')
      .where('invoice.buyerInvestor.id = :investorId', {
        investorId: user.id,
      })
      .andWhere('debtor.id IS NOT NULL')
      .groupBy('debtor.id')
      .addGroupBy('debtor.companyName')
      .orderBy('"totalAmount"', 'DESC')
      .limit(10)
      .getRawMany<{
        debtorId: string;
        companyName: string;
        invoiceCount: string;
        totalAmount: string;
        averageRating: string;
      }>();

    return result.map((row) => ({
      debtorId: row.debtorId,
      companyName: row.companyName,
      invoiceCount: Number(row.invoiceCount),
      totalAmount: Number(row.totalAmount),
      averageRating: Number(row.averageRating),
    }));
  }

  private async getPortfolioDiversification(user: User) {
    const summaryResult = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('COUNT(DISTINCT invoice.debtor)', 'differentDebtors')
      .addSelect('COUNT(DISTINCT invoice.id)', 'differentInvoices')
      .addSelect('COALESCE(AVG(invoice.amount), 0)', 'averageInvoiceAmount')
      .addSelect('COALESCE(SUM(invoice.amount), 0)', 'totalAmount')
      .where('invoice.buyerInvestor.id = :investorId', {
        investorId: user.id,
      })
      .getRawOne<{
        differentDebtors: string;
        differentInvoices: string;
        averageInvoiceAmount: string;
        totalAmount: string;
      }>();

    const maxDebtorResult = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('invoice.debtor', 'debtorId')
      .addSelect('COALESCE(SUM(invoice.amount), 0)', 'debtorTotalAmount')
      .where('invoice.buyerInvestor.id = :investorId', {
        investorId: user.id,
      })
      .groupBy('invoice.debtor')
      .orderBy('"debtorTotalAmount"', 'DESC')
      .limit(1)
      .getRawOne<{
        debtorId: string;
        debtorTotalAmount: string;
      }>();

    const differentDebtors = Number(summaryResult?.differentDebtors ?? 0);
    const differentInvoices = Number(summaryResult?.differentInvoices ?? 0);
    const averageInvoiceAmount = Number(
      summaryResult?.averageInvoiceAmount ?? 0,
    );
    const totalAmount = Number(summaryResult?.totalAmount ?? 0);
    const maxDebtorExposure = Number(maxDebtorResult?.debtorTotalAmount ?? 0);
    const maxDebtorExposurePercentage =
      totalAmount > 0 ? (maxDebtorExposure / totalAmount) * 100 : 0;

    return {
      differentDebtors,
      differentInvoices,
      averageInvoiceAmount,
      maxDebtorExposure,
      maxDebtorExposurePercentage,
    };
  }
  // End::Individual

  // Start::Company
  private async getCompanyInvoicesByStatus(user: User) {
    const result = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoin('invoice.sellerInvestor', 'sellerInvestor')
      .select('invoice.status', 'status')
      .addSelect('COUNT(invoice.id)', 'invoiceCount')
      .addSelect('COALESCE(SUM(invoice.amount), 0)', 'totalAmount')
      .where('sellerInvestor.id = :investorId', { investorId: user.id })
      .groupBy('invoice.status')
      .orderBy('"invoiceCount"', 'DESC')
      .getRawMany<{
        status: string;
        invoiceCount: string;
        totalAmount: string;
      }>();

    return result.map((row) => ({
      status: row.status,
      invoiceCount: Number(row.invoiceCount),
      totalAmount: Number(row.totalAmount),
    }));
  }

  private async getCompanyPublishedInvoicesVolume(user: User) {
    const result = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoin('invoice.sellerInvestor', 'sellerInvestor')
      .select('COALESCE(SUM(invoice.amount), 0)', 'publishedInvoicesVolume')
      .addSelect('COUNT(invoice.id)', 'publishedInvoicesCount')
      .where('sellerInvestor.id = :investorId', { investorId: user.id })
      .getRawOne<{
        publishedInvoicesVolume: string;
        publishedInvoicesCount: string;
      }>();

    return {
      publishedInvoicesVolume: Number(result?.publishedInvoicesVolume ?? 0),
      publishedInvoicesCount: Number(result?.publishedInvoicesCount ?? 0),
    };
  }

  private async getCompanyFinancedOwnInvoicesVolume(user: User) {
    const result = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoin('invoice.sellerInvestor', 'sellerInvestor')
      .select('COALESCE(SUM(invoice.amount), 0)', 'financedOwnInvoicesVolume')
      .addSelect('COUNT(invoice.id)', 'financedOwnInvoicesCount')
      .where('sellerInvestor.id = :investorId', { investorId: user.id })
      .andWhere('invoice.buyerInvestor IS NOT NULL')
      .getRawOne<{
        financedOwnInvoicesVolume: string;
        financedOwnInvoicesCount: string;
      }>();

    return {
      financedOwnInvoicesVolume: Number(result?.financedOwnInvoicesVolume ?? 0),
      financedOwnInvoicesCount: Number(result?.financedOwnInvoicesCount ?? 0),
    };
  }

  private async getCompanyPendingValidationInvoices(user: User) {
    return this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoin('invoice.sellerInvestor', 'sellerInvestor')
      .leftJoinAndSelect('invoice.debtor', 'debtor')
      .select('invoice.id', 'id')
      .addSelect('invoice.amount', 'amount')
      .addSelect('invoice.dueDate', 'dueDate')
      .addSelect('invoice.status', 'status')
      .addSelect('invoice.createdAt', 'createdAt')
      .addSelect('debtor.companyName', 'debtorCompanyName')
      .where('sellerInvestor.id = :investorId', { investorId: user.id })
      .andWhere('invoice.status IN (:...statuses)', {
        statuses: ['pending', 'correction'],
      })
      .orderBy('invoice.createdAt', 'ASC')
      .getRawMany();
  }

  private async getCompanyActiveOwnAuctions(user: User) {
    return this.invoiceRepository
      .createQueryBuilder('invoice')
      .innerJoinAndSelect('invoice.auctions', 'auction')
      .leftJoin('invoice.sellerInvestor', 'sellerInvestor')
      .select('auction.id', 'id')
      .addSelect('auction.status', 'status')
      .addSelect('auction.dateStart', 'dateStart')
      .addSelect('auction.dateEnd', 'dateEnd')
      .addSelect('invoice.amount', 'amount')
      .addSelect('invoice.dueDate', 'dueDate')
      .where('sellerInvestor.id = :investorId', { investorId: user.id })
      .andWhere('auction.status IN (:...statuses)', {
        statuses: ['published'],
      })
      .orderBy('auction.dateEnd', 'ASC')
      .getRawMany();
  }

  private async getCompanyOwnAuctionsByStatus(user: User) {
    const result = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .innerJoinAndSelect('invoice.auctions', 'auction')
      .leftJoin('invoice.sellerInvestor', 'sellerInvestor')
      .select('auction.status', 'status')
      .addSelect('COUNT(auction.id)', 'auctionCount')
      .where('sellerInvestor.id = :investorId', { investorId: user.id })
      .groupBy('auction.status')
      .orderBy('"auctionCount"', 'DESC')
      .getRawMany<{ status: string; auctionCount: string }>();

    return result.map((row) => ({
      status: row.status,
      auctionCount: Number(row.auctionCount),
    }));
  }

  private async getCompanyReceivedBids(user: User) {
    const result = await this.bidRepository
      .createQueryBuilder('bid')
      .innerJoinAndSelect('bid.auction', 'auction')
      .innerJoinAndSelect('auction.invoice', 'invoice')
      .leftJoin('invoice.sellerInvestor', 'sellerInvestor')
      .select('COUNT(bid.id)', 'receivedBidsCount')
      .addSelect('COALESCE(SUM(bid.amount), 0)', 'receivedBidAmount')
      .where('sellerInvestor.id = :investorId', { investorId: user.id })
      .getRawOne<{ receivedBidsCount: string; receivedBidAmount: string }>();

    return {
      receivedBidsCount: Number(result?.receivedBidsCount ?? 0),
      receivedBidAmount: Number(result?.receivedBidAmount ?? 0),
    };
  }

  private async getCompanyAverageFinancingCost(user: User) {
    const result = await this.bidRepository
      .createQueryBuilder('bid')
      .innerJoinAndSelect('bid.auction', 'auction')
      .innerJoinAndSelect('auction.invoice', 'invoice')
      .leftJoin('invoice.sellerInvestor', 'sellerInvestor')
      .select('COALESCE(AVG(bid.discount), 0)', 'averageDiscount')
      .addSelect(
        'COALESCE(AVG(bid.profitability), 0)',
        'averageInvestorProfitability',
      )
      .where('sellerInvestor.id = :investorId', { investorId: user.id })
      .getRawOne<{
        averageDiscount: string;
        averageInvestorProfitability: string;
      }>();

    return {
      averageDiscount: Number(result?.averageDiscount ?? 0),
      averageInvestorProfitability: Number(
        result?.averageInvestorProfitability ?? 0,
      ),
    };
  }

  private async getCompanyEstimatedSellerFees(user: User) {
    const result = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoin('invoice.sellerInvestor', 'sellerInvestor')
      .select(
        'COALESCE(SUM("invoice"."amount" * COALESCE("invoice"."transactionFeeSellerpercentage", 0) / 100), 0)',
        'sellerFeesAmount',
      )
      .where('sellerInvestor.id = :investorId', { investorId: user.id })
      .andWhere('invoice.buyerInvestor IS NOT NULL')
      .getRawOne<{ sellerFeesAmount: string }>();

    return Number(result?.sellerFeesAmount ?? 0);
  }

  private async getCompanyDebtorsByStatus(user: User) {
    const result = await this.invoiceRepository.manager
      .getRepository(Debtor)
      .createQueryBuilder('debtor')
      .select('debtor.status', 'status')
      .addSelect('COUNT(debtor.id)', 'debtorCount')
      .where('debtor.investorId = :investorId', { investorId: user.id })
      .groupBy('debtor.status')
      .orderBy('"debtorCount"', 'DESC')
      .getRawMany<{ status: string; debtorCount: string }>();

    return result.map((row) => ({
      status: row.status,
      debtorCount: Number(row.debtorCount),
    }));
  }

  private async getCompanyDocumentsPerInvoice(user: User) {
    return this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoin('invoice.sellerInvestor', 'sellerInvestor')
      .leftJoin('invoice.documents', 'document')
      .select('invoice.id', 'invoiceId')
      .addSelect('invoice.amount', 'amount')
      .addSelect('COUNT(document.id)', 'documentsCount')
      .where('sellerInvestor.id = :investorId', { investorId: user.id })
      .groupBy('invoice.id')
      .addGroupBy('invoice.amount')
      .addGroupBy('invoice.createdAt')
      .orderBy('"documentsCount"', 'ASC')
      .addOrderBy('invoice.createdAt', 'DESC')
      .getRawMany();
  }

  private async getCompanyAverageTimeToFinance(user: User) {
    const result = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoin('invoice.sellerInvestor', 'sellerInvestor')
      .select(
        'COALESCE(AVG(EXTRACT(EPOCH FROM (invoice."updatedAt" - invoice."createdAt")) / 86400), 0)',
        'avgTimeToFinanceDays',
      )
      .where('sellerInvestor.id = :investorId', { investorId: user.id })
      .andWhere('invoice.buyerInvestor IS NOT NULL')
      .getRawOne<{ avgTimeToFinanceDays: string }>();

    return Number(result?.avgTimeToFinanceDays ?? 0);
  }

  private async getCompanyInvestorActivity(user: User) {
    const result = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoin('invoice.buyerInvestor', 'buyerInvestor')
      .select('COALESCE(SUM(invoice.amount), 0)', 'companyInvestorVolume')
      .addSelect('COUNT(invoice.id)', 'companyAcquiredInvoices')
      .where('buyerInvestor.id = :investorId', { investorId: user.id })
      .getRawOne<{
        companyInvestorVolume: string;
        companyAcquiredInvoices: string;
      }>();

    return {
      companyInvestorVolume: Number(result?.companyInvestorVolume ?? 0),
      companyAcquiredInvoices: Number(result?.companyAcquiredInvoices ?? 0),
    };
  }
  // End::Company

  // Start::Admin
  private async getAdminUsersByStatusAndType() {
    const result = await this.investorRepository
      .createQueryBuilder('investor')
      .select('investor.type', 'type')
      .addSelect('investor.investorType', 'investorType')
      .addSelect('investor.status', 'status')
      .addSelect('COUNT(investor.id)', 'usersCount')
      .groupBy('investor.type')
      .addGroupBy('investor.investorType')
      .addGroupBy('investor.status')
      .orderBy('"usersCount"', 'DESC')
      .getRawMany<{
        type: string;
        investorType: string;
        status: string;
        usersCount: string;
      }>();

    return result.map((row) => ({
      type: row.type,
      investorType: row.investorType,
      status: row.status,
      usersCount: Number(row.usersCount),
    }));
  }

  private async getAdminUsersPendingValidation() {
    const result = await this.investorRepository
      .createQueryBuilder('investor')
      .select('COUNT(investor.id)', 'pendingUsersCount')
      .where('investor.status = :status', {
        status: InvestorStatus.PENDING,
      })
      .getRawOne<{ pendingUsersCount: string }>();

    return Number(result?.pendingUsersCount ?? 0);
  }

  private async getAdminDebtorsByStatus() {
    const result = await this.debtorRepository
      .createQueryBuilder('debtor')
      .select('debtor.status', 'status')
      .addSelect('COUNT(debtor.id)', 'debtorsCount')
      .groupBy('debtor.status')
      .orderBy('"debtorsCount"', 'DESC')
      .getRawMany<{ status: string; debtorsCount: string }>();

    return result.map((row) => ({
      status: row.status,
      debtorsCount: Number(row.debtorsCount),
    }));
  }

  private async getAdminDebtorsPendingValidation() {
    const result = await this.debtorRepository
      .createQueryBuilder('debtor')
      .select('COUNT(debtor.id)', 'pendingDebtorsCount')
      .where('debtor.status = :status', {
        status: DebtorStatus.PENDING,
      })
      .getRawOne<{ pendingDebtorsCount: string }>();

    return Number(result?.pendingDebtorsCount ?? 0);
  }

  private async getAdminInvoicesByStatus() {
    const result = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('invoice.status', 'status')
      .addSelect('COUNT(invoice.id)', 'invoiceCount')
      .addSelect('COALESCE(SUM(invoice.amount), 0)', 'totalAmount')
      .groupBy('invoice.status')
      .orderBy('"invoiceCount"', 'DESC')
      .getRawMany<{
        status: string;
        invoiceCount: string;
        totalAmount: string;
      }>();

    return result.map((row) => ({
      status: row.status,
      invoiceCount: Number(row.invoiceCount),
      totalAmount: Number(row.totalAmount),
    }));
  }

  private async getAdminInvoicesPendingValidation() {
    const result = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('COUNT(invoice.id)', 'pendingInvoicesCount')
      .where('invoice.status = :status', {
        status: InvoiceStatus.PENDING,
      })
      .getRawOne<{ pendingInvoicesCount: string }>();

    return Number(result?.pendingInvoicesCount ?? 0);
  }

  private async getAdminAuctionsByStatus() {
    const result = await this.auctionRepository
      .createQueryBuilder('auction')
      .select('auction.status', 'status')
      .addSelect('COUNT(auction.id)', 'auctionCount')
      .groupBy('auction.status')
      .orderBy('"auctionCount"', 'DESC')
      .getRawMany<{ status: string; auctionCount: string }>();

    return result.map((row) => ({
      status: row.status,
      auctionCount: Number(row.auctionCount),
    }));
  }

  private async getAdminAuctionsInTransition() {
    const result = await this.auctionRepository
      .createQueryBuilder('auction')
      .select('COUNT(auction.id)', 'transitioningAuctionsCount')
      .where('auction.status = :status', {
        status: AuctionStatus.TRANSITIONING,
      })
      .getRawOne<{ transitioningAuctionsCount: string }>();

    return Number(result?.transitioningAuctionsCount ?? 0);
  }

  private async getAdminPlatformTotalFinancedVolume() {
    const result = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('COALESCE(SUM(invoice.amount), 0)', 'platformTotalFinancedVolume')
      .addSelect('COUNT(invoice.id)', 'platformFinancedInvoicesCount')
      .where('invoice.buyerInvestor IS NOT NULL')
      .getRawOne<{
        platformTotalFinancedVolume: string;
        platformFinancedInvoicesCount: string;
      }>();

    return {
      platformTotalFinancedVolume: Number(
        result?.platformTotalFinancedVolume ?? 0,
      ),
      platformFinancedInvoicesCount: Number(
        result?.platformFinancedInvoicesCount ?? 0,
      ),
    };
  }

  private async getAdminEstimatedPlatformFees() {
    const result = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select(
        'COALESCE(SUM("invoice"."amount" * (COALESCE("invoice"."transactionFeeSellerpercentage", 0) + COALESCE("invoice"."transactionFeeBuyerpercentage", 0)) / 100), 0)',
        'estimatedPlatformFees',
      )
      .where('invoice.buyerInvestor IS NOT NULL')
      .getRawOne<{ estimatedPlatformFees: string }>();

    return Number(result?.estimatedPlatformFees ?? 0);
  }

  private async getAdminActiveInvestors() {
    const result = await this.bidRepository
      .createQueryBuilder('bid')
      .select('COUNT(DISTINCT bid.investorId)', 'activeInvestorsCount')
      .getRawOne<{ activeInvestorsCount: string }>();

    return Number(result?.activeInvestorsCount ?? 0);
  }

  private async getAdminAuctionToFinanceConversion() {
    const auctionedResult = await this.auctionRepository
      .createQueryBuilder('auction')
      .select('COUNT(DISTINCT auction.invoiceId)', 'auctionedInvoices')
      .where('auction.status != :draftStatus', {
        draftStatus: AuctionStatus.DRAFT,
      })
      .getRawOne<{ auctionedInvoices: string }>();

    const financedResult = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('COUNT(DISTINCT invoice.id)', 'financedInvoices')
      .where('invoice.buyerInvestor IS NOT NULL')
      .getRawOne<{ financedInvoices: string }>();

    const auctionedInvoices = Number(auctionedResult?.auctionedInvoices ?? 0);
    const financedInvoices = Number(financedResult?.financedInvoices ?? 0);

    return {
      auctionedInvoices,
      financedInvoices,
      auctionToFinanceConversion:
        auctionedInvoices > 0
          ? Number(((financedInvoices / auctionedInvoices) * 100).toFixed(2))
          : 0,
    };
  }

  private async getAdminMonthlyFinancedVolume() {
    const now = new Date();
    const windowStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const windowEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const result = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select(`date_trunc('month', invoice.createdAt)`, 'month')
      .addSelect('COUNT(invoice.id)', 'invoiceCount')
      .addSelect('COALESCE(SUM(invoice.amount), 0)', 'financedVolume')
      .where('invoice.buyerInvestor IS NOT NULL')
      .andWhere('invoice.createdAt >= :windowStart', { windowStart })
      .andWhere('invoice.createdAt < :windowEnd', { windowEnd })
      .groupBy(`date_trunc('month', invoice.createdAt)`)
      .orderBy('month', 'ASC')
      .getRawMany<{
        month: Date;
        invoiceCount: string;
        financedVolume: string;
      }>();

    return result.map((row) => ({
      month: row.month,
      invoiceCount: Number(row.invoiceCount),
      financedVolume: Number(row.financedVolume),
    }));
  }

  private async getAdminOverduePendingInvoices() {
    const result = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('COUNT(invoice.id)', 'overdueInvoices')
      .addSelect('COALESCE(SUM(invoice.amount), 0)', 'overdueAmount')
      .where('invoice.buyerInvestor IS NOT NULL')
      .andWhere('invoice.dueDate < CURRENT_DATE')
      .getRawOne<{ overdueInvoices: string; overdueAmount: string }>();

    return {
      overdueInvoices: Number(result?.overdueInvoices ?? 0),
      overdueAmount: Number(result?.overdueAmount ?? 0),
    };
  }

  private async getAdminPlatformRiskDistribution() {
    const result = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('invoice.rating', 'rating')
      .addSelect('COUNT(invoice.id)', 'invoiceCount')
      .addSelect('COALESCE(SUM(invoice.amount), 0)', 'totalAmount')
      .where('invoice.buyerInvestor IS NOT NULL')
      .andWhere('invoice.rating IS NOT NULL')
      .groupBy('invoice.rating')
      .orderBy('invoice.rating', 'ASC')
      .getRawMany<{
        rating: string;
        invoiceCount: string;
        totalAmount: string;
      }>();

    return result.map((row) => ({
      rating: Number(row.rating),
      invoiceCount: Number(row.invoiceCount),
      totalAmount: Number(row.totalAmount),
    }));
  }

  private async getAdminTopDebtorsByExposure() {
    const result = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .innerJoin('invoice.debtor', 'debtor')
      .select('debtor.id', 'debtorId')
      .addSelect('debtor.companyName', 'companyName')
      .addSelect('COUNT(invoice.id)', 'invoiceCount')
      .addSelect('COALESCE(SUM(invoice.amount), 0)', 'totalAmount')
      .where('invoice.buyerInvestor IS NOT NULL')
      .groupBy('debtor.id')
      .addGroupBy('debtor.companyName')
      .orderBy('"totalAmount"', 'DESC')
      .limit(10)
      .getRawMany<{
        debtorId: string;
        companyName: string;
        invoiceCount: string;
        totalAmount: string;
      }>();

    return result.map((row) => ({
      debtorId: row.debtorId,
      companyName: row.companyName,
      invoiceCount: Number(row.invoiceCount),
      totalAmount: Number(row.totalAmount),
    }));
  }

  private async getAdminAggregatedBankAccountBalances() {
    const result = await this.bankAccountRepository
      .createQueryBuilder('bankAccount')
      .select('bankAccount.platform', 'platform')
      .addSelect('COALESCE(SUM(bankAccount.balance), 0)', 'totalBalance')
      .addSelect(
        'COALESCE(SUM(bankAccount.reservedBalance), 0)',
        'totalReservedBalance',
      )
      .groupBy('bankAccount.platform')
      .orderBy('"totalBalance"', 'DESC')
      .getRawMany<{
        platform: boolean;
        totalBalance: string;
        totalReservedBalance: string;
      }>();

    return result.map((row) => ({
      platform: row.platform,
      totalBalance: Number(row.totalBalance),
      totalReservedBalance: Number(row.totalReservedBalance),
    }));
  }
  // End::Admin
}
