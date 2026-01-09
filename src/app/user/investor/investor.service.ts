import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { BankAccountService } from 'src/app/bank-account/bank-account.service';
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
      throw new BadRequestException('Document file is required');
    }

    try {
      createInvestorDto.password = await bcrypt.hash(
        createInvestorDto.password,
        10,
      );

      const bankAccount = await this.bankAccountService.create({});

      const investor = await this.investorRepository.save(
        Object.assign(createInvestorDto, {
          bankAccount,
          lastCommunication: 'Pendiente de revisión por usuario administrador',
        }),
      );

      const document = await this.documentService.create(
        {
          title: `${createInvestorDto.companyName}'s ID document`,
          value: createInvestorDto.documentValue,
          type: DocumentType.IDENTIFICATION,
        },
        documentFile,
        investor,
      );

      await this.documentService.uploadFile(documentFile, document.id);

      return investor;
    } catch (error) {
      console.error(error);
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
      throw new InternalServerErrorException(error);
    }
  }

  async findAll(query: GetInvestorsDto, user: User) {
    const queryBuilder = this.investorRepository.createQueryBuilder('investor');

    if (user.type === UserType.ADMIN) {
      queryBuilder.leftJoinAndSelect('investor.documents', 'document');
      queryBuilder.leftJoinAndSelect('investor.bankAccount', 'bankAccount');
      queryBuilder.andWhere('document.type = :documentType', {
        documentType: DocumentType.IDENTIFICATION,
      });

      if (query.includeDeleted) queryBuilder.withDeleted();
    } else {
      queryBuilder.leftJoin('investor.documents', 'document');
      queryBuilder.select([
        'investor.id',
        'investor.email',
        'investor.name',
        'investor.phoneNumber',
        'investor.companyName',
        'investor.investorType',
        'investor.status',
      ]);
    }

    if (query.email) {
      queryBuilder.andWhere('investor.email ILIKE :email', {
        email: `%${query.email}%`,
      });
    }

    if (query.name) {
      queryBuilder.andWhere('investor.name ILIKE :name', {
        name: `%${query.name}%`,
      });
    }

    if (query.companyName) {
      queryBuilder.andWhere('investor.companyName ILIKE :companyName', {
        companyName: `%${query.companyName}%`,
      });
    }

    if (query.phoneNumber) {
      queryBuilder.andWhere('investor.phoneNumber = :phoneNumber', {
        phoneNumber: query.phoneNumber,
      });
    }

    if (query.documentValue) {
      queryBuilder.andWhere('document.value = :documentValue', {
        documentValue: query.documentValue,
      });
    }

    if (query.investorType) {
      queryBuilder.andWhere('investor.investorType = :investorType', {
        investorType: query.investorType,
      });
    }

    if (query.status) {
      queryBuilder.andWhere('investor.status = :status', {
        status: query.status,
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
    const investor = await (async () => {
      if (user && (user.type === UserType.ADMIN || user.id === id)) {
        return await this.investorRepository.findOne({
          where: { id },
          relations: ['documents', 'bankAccount'],
        });
      } else if (
        user &&
        user.type !== UserType.ADMIN &&
        user.id !== id &&
        (user as Investor).status === InvestorStatus.PENDING
      ) {
        throw new UnauthorizedException(
          `You don't have permissions to perform this action`,
        );
      } else {
        return await this.investorRepository.findOne({
          where: { id },
          select: {
            lastCommunication: false,
            createdAt: false,
            updatedAt: false,
            deletedAt: false,
          },
        });
      }
    })();

    if (!investor) {
      throw new NotFoundException(`Investor with id '${id}' not found`);
    }

    return investor;
  }

  async update(
    id: string,
    updateInvestorDto: UpdateInvestorDto,
    file: Express.Multer.File | undefined,
    user: User,
  ) {
    const investor = await this.findOne(id, user);
    this.checkPermissions(investor, user);
    this.checkIsPending(investor, user);
    this.checkIsDenied(investor, user);

    if (
      user.type !== UserType.ADMIN &&
      investor.status === InvestorStatus.CORRECTION
    ) {
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
      user.type !== UserType.ADMIN &&
      updateInvestorDto.status !== investor.status &&
      (investor.status !== InvestorStatus.CORRECTION ||
        updateInvestorDto.status !== InvestorStatus.PENDING)
    ) {
      throw new UnauthorizedException(
        "You don't have permissions to perform this action",
      );
    } else if (
      user.type !== UserType.ADMIN &&
      investor.status === InvestorStatus.VERIFIED
    ) {
      updateInvestorDto.name = investor.name;
      updateInvestorDto.companyName = investor.companyName;
      updateInvestorDto.investorType = investor.investorType;
      updateInvestorDto.documentValue = undefined;
      file = undefined;
    }

    if (updateInvestorDto.password && updateInvestorDto.passwordRepeat) {
      if (updateInvestorDto.password !== updateInvestorDto.passwordRepeat) {
        throw new BadRequestException('Passwords do not match');
      }
    }

    let documentPath: string | null = null;
    let newDocument: Document | undefined = undefined;
    try {
      if (updateInvestorDto.password) {
        updateInvestorDto.password = await bcrypt.hash(
          updateInvestorDto.password,
          10,
        );
      }

      if (file && !updateInvestorDto.documentValue)
        throw new BadRequestException(
          'Document value is required when uploading a new document file',
        );

      if (file && updateInvestorDto.documentValue) {
        newDocument = await this.documentService.create(
          {
            title: `${investor.companyName}'s ID document`,
            value: updateInvestorDto.documentValue,
            type: DocumentType.IDENTIFICATION,
          },
          file,
          investor,
        );

        if (!investor.documents) {
          investor.documents = [];
        }
        investor.documents.push(newDocument);

        documentPath = await this.documentService.uploadFile(
          file,
          newDocument.id,
        );

        updateInvestorDto.status = InvestorStatus.PENDING;
        updateInvestorDto.lastCommunication =
          'Pendiente de revisión por usuario administrador';
      }

      Object.assign(investor, updateInvestorDto.removeUndefined());
      return await this.investorRepository.save(investor);
    } catch (error) {
      if (documentPath) {
        await this.documentService.deleteFile(documentPath);
      }

      if (newDocument) {
        await this.documentService.remove(newDocument.id, user);
      }

      console.error(error);
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
      throw new InternalServerErrorException(error);
    }
  }

  async remove(id: string, user: User) {
    const investor = await this.findOne(id, user);

    this.checkPermissions(investor, user);

    return await this.investorRepository.softDelete(id);
  }

  private checkPermissions(investor: Investor, user: User) {
    if (user.type !== UserType.ADMIN && user.id !== investor.id) {
      throw new UnauthorizedException(
        "You don't have permissions to perform this action",
      );
    }
  }

  private checkIsDenied(investor: Investor, user: User) {
    if (
      user.type !== UserType.ADMIN &&
      investor.status === InvestorStatus.DENIED
    ) {
      throw new BadRequestException(`Investor user has been denied`);
    }
  }

  private checkIsPending(investor: Investor, user: User) {
    if (
      user.type !== UserType.ADMIN &&
      investor.status === InvestorStatus.PENDING
    ) {
      throw new BadRequestException(`Investor user is pending`);
    }
  }
}
