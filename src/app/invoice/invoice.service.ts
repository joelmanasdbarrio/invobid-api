import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DebtorService } from 'src/app/debtor/debtor.service';
import { DebtorStatus } from 'src/app/debtor/enums/debtor-status.enum';
import { DocumentService } from 'src/app/document/document.service';
import { Document } from 'src/app/document/entities/document.entity';
import { DocumentType } from 'src/app/document/enums/document-type.enum';
import { GetInvoicesDto } from 'src/app/invoice/dto/get-invoices.dto';
import { Invoice } from 'src/app/invoice/entities/invoice.entity';
import { InvoiceStatus } from 'src/app/invoice/enums/invoice-status.enum';
import { UserType } from 'src/app/user/common/enums/user-type.enum';
import { Repository } from 'typeorm';
import { User } from '../user/common/entities/user.entity';
import { Investor } from '../user/investor/entities/investor.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { RatingService } from 'src/app/invoice/services/rating.service';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    private readonly documentService: DocumentService,
    private readonly debtorService: DebtorService,
    private readonly ratingService: RatingService, // TODO: apply invoice rating
  ) {}

  async create(
    createInvoiceDto: CreateInvoiceDto,
    file: Express.Multer.File,
    user: Investor,
  ) {
    if (!file) {
      throw new BadRequestException('file must be a valid Invoice document');
    }

    const debtor = await this.debtorService.findOne(
      createInvoiceDto.debtorId,
      user,
    );

    if (
      debtor.status !== DebtorStatus.VERIFIED ||
      debtor.investor.id !== user.id
    ) {
      throw new BadRequestException(
        `Debtor with id '${debtor.id}' is not verified and/or does not belong to the user`,
      );
    }

    // await this.ratingService.eval({
    //   companyId: debtor.companyName,
    //   invoiceDueDate: createInvoiceDto.dueDate,
    //   invoiceIssueDate: createInvoiceDto.issueDate,
    //   invoiceAmount: createInvoiceDto.amount,
    // });

    const minDueDate = new Date();
    minDueDate.setUTCHours(0, 0, 0, 0);
    minDueDate.setUTCMonth(minDueDate.getUTCMonth() + 1);
    minDueDate.setUTCDate(minDueDate.getUTCDate() + 7);

    if (new Date(createInvoiceDto.dueDate) < minDueDate) {
      throw new BadRequestException(
        `Due date must be at least 5 weeks from today`,
      );
    }

    if (
      new Date(createInvoiceDto.issueDate) >= new Date(createInvoiceDto.dueDate)
    ) {
      throw new BadRequestException(`Issue date must be before the due date`);
    }

    const buyerPercentage: number = parseFloat(
      String(process.env.BUYER_TRANSFER_FEE_PERCENTAGE),
    );
    const sellerPercentage: number = parseFloat(
      String(process.env.SELLER_TRANSFER_FEE_PERCENTAGE),
    );

    let document: Document | undefined;
    let invoice: Invoice | undefined;
    try {
      invoice = await this.invoiceRepository.save({
        ...createInvoiceDto,
        transactionFee: {
          buyerPercentage,
          sellerPercentage,
        },
        sellerInvestor: user,
        debtor: debtor,
      });

      document = await this.documentService.create(
        {
          title: `${user.name}'s ${debtor.companyName} invoice document`,
          value: createInvoiceDto.svc,
          type: DocumentType.INVOICE,
        },
        file,
        user,
      );

      invoice.documents = [document];
      await this.invoiceRepository.save(invoice);

      return invoice;
    } catch (error) {
      console.error(error);
      if (document) {
        await this.documentService.remove(document.id, user, false);
      }
      if (invoice) {
        await this.invoiceRepository.delete(invoice.id);
      }

      throw error;
    }
  }

  async findAll(query: GetInvoicesDto, user: User) {
    const queryBuilder = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.debtor', 'debtor')
      .leftJoinAndSelect('invoice.sellerInvestor', 'sellerInvestor')
      .leftJoinAndSelect('invoice.buyerInvestor', 'buyerInvestor')
      .leftJoinAndSelect('invoice.auctions', 'auctions')
      .leftJoinAndSelect('invoice.documents', 'documents');

    if (user.type !== UserType.ADMIN) {
      queryBuilder.andWhere(
        '(sellerInvestor.id = :investorId OR (invoice.status = :status AND buyerInvestor.id = :investorId))',
        {
          investorId: user.id,
          status: InvoiceStatus.VERIFIED,
        },
      );
    }

    if (query.includeDeleted && query.includeDeleted > 0) {
      queryBuilder.withDeleted();
    }

    if (query.invoiceSvc) {
      queryBuilder.andWhere('(invoice.svc ILIKE :invoiceSvc)', {
        invoiceSvc: `%${query.invoiceSvc}%`,
      });
    }

    if (query.sellerInvestorId) {
      queryBuilder.andWhere('(sellerInvestor.id = :sellerInvestorId)', {
        sellerInvestorId: query.sellerInvestorId,
      });
    }

    if (query.sellerCompanyName) {
      queryBuilder.andWhere(
        '(sellerInvestor.companyName ILIKE :sellerCompanyName)',
        {
          sellerCompanyName: `%${query.sellerCompanyName}%`,
        },
      );
    }

    if (query.buyerInvestorId) {
      queryBuilder.andWhere('(buyerInvestor.id = :buyerInvestorId)', {
        buyerInvestorId: query.buyerInvestorId,
      });
    }

    if (query.buyerCompanyName) {
      queryBuilder.andWhere(
        '(buyerInvestor.companyName ILIKE :buyerCompanyName)',
        {
          buyerCompanyName: `%${query.buyerCompanyName}%`,
        },
      );
    }

    if (query.debtorId) {
      queryBuilder.andWhere('(invoice.debtorId = :debtorId)', {
        debtorId: query.debtorId,
      });
    }

    if (query.debtorCompanyName) {
      queryBuilder.andWhere('(debtor.companyName ILIKE :debtorCompanyName)', {
        debtorCompanyName: `%${query.debtorCompanyName}%`,
      });
    }

    if (query.minAmount) {
      queryBuilder.andWhere('(invoice.amount >= :minAmount)', {
        minAmount: query.minAmount,
      });
    }

    if (query.maxAmount) {
      queryBuilder.andWhere('(invoice.amount <= :maxAmount)', {
        maxAmount: query.maxAmount,
      });
    }

    if (query.minRating) {
      queryBuilder.andWhere(
        '(invoice.rating >= :minRating OR invoice.extRating >= :minRating)',
        {
          minRating: query.minRating,
        },
      );
    }

    if (query.status) {
      queryBuilder.andWhere('(invoice.status = :status)', {
        status: query.status,
      });
    }

    if (query.dueDateFrom) {
      queryBuilder.andWhere('(invoice.dueDate >= :dueDateFrom)', {
        dueDateFrom: query.dueDateFrom,
      });
    }

    if (query.dueDateTo) {
      queryBuilder.andWhere('(invoice.dueDate <= :dueDateTo)', {
        dueDateTo: query.dueDateTo,
      });
    }

    if (query.isSold !== undefined) {
      if (query.isSold > 0) {
        queryBuilder.andWhere('(invoice.buyerInvestorId IS NOT NULL)');
      } else {
        queryBuilder.andWhere('(invoice.buyerInvestorId IS NULL)');
      }
    }

    const total = await queryBuilder.getCount();

    if (query.page && query.limit) {
      const skip = (query.page - 1) * query.limit;
      queryBuilder.skip(skip).take(query.limit);
    }

    const data = await queryBuilder.getMany();

    return {
      data,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async findOne(id: string, user: User) {
    const queryBuilder = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.sellerInvestor', 'sellerInvestor')
      .leftJoinAndSelect('invoice.buyerInvestor', 'buyerInvestor')
      .leftJoinAndSelect('invoice.auctions', 'auctions')
      .leftJoinAndSelect('invoice.debtor', 'debtor')
      .where('invoice.id = :id', { id })
      .withDeleted();

    if (user.type !== UserType.ADMIN) {
      queryBuilder.andWhere(
        '(invoice.sellerInvestorId = :investorId OR (invoice.status = :verifiedStatusInvoice AND debtor.status = :verifiedStatusDebtor))',
        {
          investorId: user.id,
          verifiedStatusInvoice: InvoiceStatus.VERIFIED,
          verifiedStatusDebtor: DebtorStatus.VERIFIED,
        },
      );
    }

    if (user.type === UserType.ADMIN) {
      queryBuilder.leftJoinAndSelect('invoice.documents', 'documents');
    } else {
      queryBuilder.leftJoinAndSelect(
        'invoice.documents',
        'documents',
        '(invoice.sellerInvestorId = :investorId OR invoice.buyerInvestorId = :investorId)',
        { investorId: user.id },
      );
    }

    const invoice = await queryBuilder.getOne();

    if (!invoice) {
      throw new NotFoundException(`Invoice with id '${id}' not found`);
    }

    return invoice;
  }

  async update(
    id: string,
    updateInvoiceDto: UpdateInvoiceDto,
    file: Express.Multer.File | undefined,
    user: User,
  ) {
    const invoice = await this.findOne(id, user);

    if (invoice.buyerInvestor && invoice.buyerInvestor.id !== null) {
      throw new ForbiddenException(
        `Invoice with id ${id} can no longer be updated`,
      );
    }

    if (invoice.sellerInvestor.id !== user.id && user.type !== UserType.ADMIN) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    if (user.type !== UserType.ADMIN) {
      if (invoice.status === InvoiceStatus.CORRECTION) {
        if (
          updateInvoiceDto.status &&
          updateInvoiceDto.status === InvoiceStatus.PENDING
        ) {
          updateInvoiceDto.status = InvoiceStatus.PENDING;
          updateInvoiceDto.lastCommunication =
            'Pendiente de revisión por usuario administrador';
        } else {
          updateInvoiceDto.status = invoice.status;
          updateInvoiceDto.lastCommunication = invoice.lastCommunication;
        }
      } else if (
        updateInvoiceDto.status !== invoice.status &&
        updateInvoiceDto.status !== InvoiceStatus.PENDING
      ) {
        throw new UnauthorizedException(
          "You don't have permissions to perform this action",
        );
      } else if (invoice.status === InvoiceStatus.VERIFIED) {
        updateInvoiceDto.rating = invoice.rating;
        updateInvoiceDto.extRating = invoice.extRating;
        updateInvoiceDto.status = invoice.status;
        updateInvoiceDto.lastCommunication = invoice.lastCommunication;
        file = undefined;
      }
    } else {
      file = undefined;
    }

    let document: Document | undefined;
    try {
      if (file) {
        document = await this.documentService.create(
          {
            title: `${user.name}'s ${invoice.debtor.companyName} invoice document`,
            value: updateInvoiceDto.svc || invoice.svc,
            type: DocumentType.INVOICE,
          },
          file,
          user,
        );

        if (!invoice.documents) {
          invoice.documents = [];
        }
        invoice.documents.push(document);
      }

      Object.assign(invoice, updateInvoiceDto.removeUndefined());
      return await this.invoiceRepository.save(invoice);
    } catch (error) {
      console.error(error);
      if (document) {
        await this.documentService.deleteFile(document.filename);
        await this.documentService.remove(document.id, user, false);
      }

      throw new InternalServerErrorException(error);
    }
  }

  async remove(id: string, user: User, useSoft = true) {
    const invoice = await this.findOne(id, user);

    if (invoice.buyerInvestor && invoice.buyerInvestor.id !== null) {
      throw new ForbiddenException(
        `Invoice with id ${id} can no longer be updated`,
      );
    }

    if (invoice.sellerInvestor.id !== user.id) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    if (useSoft) {
      return this.invoiceRepository.softDelete(id);
    } else {
      return this.invoiceRepository.delete(id);
    }
  }
}
