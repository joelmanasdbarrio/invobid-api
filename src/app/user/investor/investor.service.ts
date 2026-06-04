import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { BankAccountService } from 'src/app/bank-account/bank-account.service';
import { BankAccount } from 'src/app/bank-account/entities/bank-account.entity';
import { DocumentService } from 'src/app/document/document.service';
import { Document } from 'src/app/document/entities/document.entity';
import { DocumentType } from 'src/app/document/enums/document-type.enum';
import { GetInvestorsDto } from 'src/app/user/investor/dto/get-investors.dto';
import { InvestorStatus } from 'src/app/user/investor/enums/investor-status.enum';
import { Repository } from 'typeorm';
import { User } from '../common/entities/user.entity';
import { UserType } from '../common/enums/user-type.enum';
import { CreateInvestorDto } from './dto/create-investor.dto';
import { UpdateInvestorDto } from './dto/update-investor.dto';
import { Investor } from './entities/investor.entity';

@Injectable()
export class InvestorService {
  constructor(
    @InjectRepository(Investor)
    private investorRepository: Repository<Investor>,
    private readonly documentService: DocumentService,
    private readonly bankAccountService: BankAccountService,
  ) {}

  async create(
    createInvestorDto: CreateInvestorDto,
    documentFile: Express.Multer.File,
  ) {
    if (createInvestorDto.password !== createInvestorDto.passwordRepeat) {
      throw new BadRequestException('Passwords do not match');
    }

    if (!documentFile) {
      throw new BadRequestException(
        'file must be a valid Investor ID document',
      );
    }

    let bankAccount: BankAccount | undefined;
    let investor: Investor | undefined;
    let document: Document | undefined;
    try {
      createInvestorDto.password = await bcrypt.hash(
        createInvestorDto.password,
        10,
      );

      bankAccount = await this.bankAccountService.create({});

      investor = await this.investorRepository.save({
        ...Object.assign(createInvestorDto, {
          bankAccount,
          lastCommunication: 'Pendiente de revisión por usuario administrador',
        }),
      });

      document = await this.documentService.create(
        {
          title: `${createInvestorDto.companyName}'s ID document`,
          value: createInvestorDto.taxId,
          type: DocumentType.ID,
        },
        documentFile,
        investor,
      );

      return investor;
    } catch (error) {
      console.error(error);
      if (investor) {
        await this.investorRepository.delete(investor.id);
      }
      if (bankAccount) {
        await this.bankAccountService.remove(bankAccount.id);
      }
      if (document) {
        await this.documentService.deleteFile(document.filename);
        await this.documentService.remove(document.id, investor!, false);
      }

      if (error instanceof BadRequestException) {
        throw error;
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error.code === '23505') {
        // eslint-disable-next-line
        if (error.detail.includes('phoneNumber')) {
          throw new BadRequestException(
            `User with phone number '${createInvestorDto.phoneNumber}' already exists`,
          );
        }
        // eslint-disable-next-line
        if (error.detail.includes('companyName')) {
          throw new BadRequestException(
            `User with company name '${createInvestorDto.companyName}' already exists`,
          );
        }
        // eslint-disable-next-line
        if (error.detail.includes('email')) {
          throw new BadRequestException(
            `User with email '${createInvestorDto.email}' already exists`,
          );
        }
      }
      if (error instanceof ServiceUnavailableException) {
        throw error;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        throw new InternalServerErrorException(error.message);
      }
    }
  }

  async findAll(query: GetInvestorsDto, user: User) {
    const queryBuilder = this.investorRepository.createQueryBuilder('investor');

    if (user.type === UserType.ADMIN) {
      if (query.status) {
        queryBuilder.andWhere('(investor.status = :status)', {
          status: query.status,
        });
      }

      if (query.includeDeleted && query.includeDeleted > 0) {
        queryBuilder.withDeleted();
      }
    } else {
      queryBuilder.select([
        'investor.id',
        'investor.email',
        'investor.name',
        'investor.phoneNumber',
        'investor.companyName',
        'investor.investorType',
      ]);
      queryBuilder.andWhere('(investor.status = :status)', {
        status: InvestorStatus.VERIFIED,
      });
    }

    if (query.email) {
      queryBuilder.andWhere('(investor.email ILIKE :email)', {
        email: `%${query.email}%`,
      });
    }

    if (query.name) {
      queryBuilder.andWhere('(investor.name ILIKE :name)', {
        name: `%${query.name}%`,
      });
    }

    if (query.companyName) {
      queryBuilder.andWhere('(investor.companyName ILIKE :companyName)', {
        companyName: `%${query.companyName}%`,
      });
    }

    if (query.phoneNumber) {
      queryBuilder.andWhere('(investor.phoneNumber = :phoneNumber)', {
        phoneNumber: query.phoneNumber,
      });
    }

    if (query.taxId) {
      queryBuilder.andWhere('(investor.taxId = :taxId)', {
        taxId: query.taxId,
      });
    }

    if (query.investorType) {
      queryBuilder.andWhere('(investor.investorType = :investorType)', {
        investorType: query.investorType,
      });
    }

    const total = await queryBuilder.getCount();

    if (query.page && query.limit) {
      const skip = (query.page - 1) * query.limit;
      queryBuilder.skip(skip).take(query.limit);
    }

    const data = await queryBuilder.getMany();

    return { data, total, page: query.page, limit: query.limit };
  }

  async findOne(id: string, user?: User) {
    const queryBuilder = this.investorRepository.createQueryBuilder('investor');

    if (user && (user.type === UserType.ADMIN || user.id === id)) {
      queryBuilder.leftJoinAndSelect('investor.bankAccount', 'bankAccount');
    } else if (user && user.type !== UserType.ADMIN && user.id !== id) {
      queryBuilder.select([
        'investor.id',
        'investor.email',
        'investor.name',
        'investor.phoneNumber',
        'investor.companyName',
        'investor.investorType',
      ]);
      queryBuilder.andWhere('(investor.status = :status)', {
        status: InvestorStatus.VERIFIED,
      });
    } else {
      queryBuilder.leftJoinAndSelect('investor.bankAccount', 'bankAccount');
    }

    const investor = await queryBuilder
      .where('(investor.id = :id)', { id })
      .getOne();

    if (!investor) {
      throw new NotFoundException(`Investor with ID '${id}' not found`);
    }

    return investor;
  }

  async update(
    id: string,
    updateInvestorDto: UpdateInvestorDto,
    documentFile: Express.Multer.File | undefined,
    user: User,
  ) {
    const investor = await this.findOne(id, user);
    this.checkPermissions(investor, user);

    if (user.type !== UserType.ADMIN) {
      if (
        investor.status === InvestorStatus.PENDING ||
        investor.status === InvestorStatus.DENIED
      ) {
        throw new ForbiddenException(
          "You don't have permissions to perform this action",
        );
      } else if (investor.status === InvestorStatus.CORRECTION) {
        if (
          updateInvestorDto.status &&
          updateInvestorDto.status.toLowerCase() ===
            InvestorStatus.PENDING.toLocaleLowerCase()
        ) {
          updateInvestorDto.status = InvestorStatus.PENDING;
          updateInvestorDto.lastCommunication =
            'Pendiente de revisión por usuario administrador';
        } else {
          updateInvestorDto.status = investor.status;
          updateInvestorDto.lastCommunication = investor.lastCommunication;
        }
      } else if (
        updateInvestorDto.status &&
        updateInvestorDto.status !== investor.status &&
        updateInvestorDto.status !== InvestorStatus.PENDING
      ) {
        throw new ForbiddenException(
          "You don't have permissions to perform this action",
        );
      } else if (investor.status === InvestorStatus.VERIFIED) {
        updateInvestorDto.name = investor.name;
        updateInvestorDto.companyName = investor.companyName;
        updateInvestorDto.investorType = investor.investorType;
        updateInvestorDto.taxId = investor.taxId;
        documentFile = undefined;
      }
    } else {
      documentFile = undefined;
    }

    if (updateInvestorDto.password && updateInvestorDto.passwordRepeat) {
      if (updateInvestorDto.password !== updateInvestorDto.passwordRepeat) {
        throw new BadRequestException('Passwords do not match');
      }
    }

    let newDocument: Document | undefined;
    try {
      if (updateInvestorDto.password) {
        updateInvestorDto.password = await bcrypt.hash(
          updateInvestorDto.password,
          10,
        );
      }

      if (user.type === UserType.INVESTOR && documentFile) {
        if (!updateInvestorDto.taxId) {
          throw new BadRequestException(
            'taxId is required when uploading a new document file',
          );
        } else {
          newDocument = await this.documentService.create(
            {
              title: `${investor.companyName}'s ID document`,
              value: updateInvestorDto.taxId,
              type: DocumentType.ID,
            },
            documentFile,
            investor,
          );

          if (!investor.documents) {
            investor.documents = [];
          }
          investor.documents.push(newDocument);
          investor.taxId = updateInvestorDto.taxId;
        }
      }

      Object.assign(investor, updateInvestorDto.removeUndefined());
      return await this.investorRepository.save(investor);
    } catch (error) {
      console.error(error);
      if (newDocument) {
        await this.documentService.deleteFile(newDocument.filename);
        await this.documentService.remove(newDocument.id, user, false);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error.code === '23505') {
        // eslint-disable-next-line
        if (error.detail.includes('phoneNumber')) {
          throw new BadRequestException(
            `Investor with phone number '${updateInvestorDto.phoneNumber}' already exists`,
          );
        }
        // eslint-disable-next-line
        if (error.detail.includes('companyName')) {
          throw new BadRequestException(
            `Investor with company name '${updateInvestorDto.companyName}' already exists`,
          );
        }
        // eslint-disable-next-line
        if (error.detail.includes('email')) {
          throw new BadRequestException(
            `User with email '${updateInvestorDto.email}' already exists`,
          );
        }
      }

      if (
        error instanceof BadRequestException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        throw new InternalServerErrorException(error.message);
      }
    }
  }

  async remove(id: string, user: User, useSoft = true) {
    const investor = await this.findOne(id, user);

    this.checkPermissions(investor, user);

    if (useSoft) {
      return await this.investorRepository.softDelete(id);
    } else {
      return await this.investorRepository.delete(id);
    }
  }

  private checkPermissions(investor: Investor, user: User) {
    if (user.type !== UserType.ADMIN && user.id !== investor.id) {
      throw new ForbiddenException(
        "You don't have permissions to perform this action",
      );
    }
  }
}
