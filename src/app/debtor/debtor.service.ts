import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GetDebtorsDto } from 'src/app/debtor/dto/get-debtors.dto';
import { Debtor } from 'src/app/debtor/entities/debtor.entity';
import { DebtorStatus } from 'src/app/debtor/enums/debtor-status.enum';
import { DocumentService } from 'src/app/document/document.service';
import { Document } from 'src/app/document/entities/document.entity';
import { DocumentType } from 'src/app/document/enums/document-type.enum';
import { User } from 'src/app/user/common/entities/user.entity';
import { UserType } from 'src/app/user/common/enums/user-type.enum';
import { Investor } from 'src/app/user/investor/entities/investor.entity';
import { InvestorStatus } from 'src/app/user/investor/enums/investor-status.enum';
import { Repository } from 'typeorm';
import { CreateDebtorDto } from './dto/create-debtor.dto';
import { UpdateDebtorDto } from './dto/update-debtor.dto';

@Injectable()
export class DebtorService {
  constructor(
    @InjectRepository(Debtor)
    private readonly debtorRepository: Repository<Debtor>,
    private readonly documentService: DocumentService,
  ) {}

  async create(
    createDebtorDto: CreateDebtorDto,
    files: { [key: string]: Express.Multer.File[] },
    investor: Investor,
  ) {
    const modelo111File =
      files[DocumentType.MODELO_111] && files[DocumentType.MODELO_111][0];
    const modelo303File =
      files[DocumentType.MODELO_303] && files[DocumentType.MODELO_303][0];

    if (!modelo111File || !modelo303File) {
      throw new BadRequestException(
        'modelo_111 and modelo_303 must be valid AEAT Documents',
      );
    }

    let debtor: Debtor | undefined;
    let modelo111: Document | undefined;
    let modelo303: Document | undefined;
    try {
      debtor = await this.debtorRepository.save({
        ...createDebtorDto,
        investor,
        lastCommunication: 'Pendiente de revisión por usuario administrador',
      });

      modelo111 = await this.documentService.create(
        {
          title: `${createDebtorDto.companyName}'s Modelo 111`,
          value: createDebtorDto.modelo111Csv,
          type: DocumentType.MODELO_111,
        },
        modelo111File,
        investor,
        debtor,
      );

      modelo303 = await this.documentService.create(
        {
          title: `${createDebtorDto.companyName}'s Modelo 303`,
          value: createDebtorDto.modelo303Csv,
          type: DocumentType.MODELO_303,
        },
        modelo303File,
        investor,
        debtor,
      );

      debtor.documents = [modelo111, modelo303];
      await this.debtorRepository.save(debtor);

      return debtor;
    } catch (error) {
      console.error(error);
      if (debtor) {
        await this.debtorRepository.delete(debtor.id);
      }
      if (modelo111) {
        await this.documentService.deleteFile(modelo111.filename);
        await this.documentService.remove(modelo111.id, investor, false);
      }
      if (modelo303) {
        await this.documentService.deleteFile(modelo303.filename);
        await this.documentService.remove(modelo303.id, investor, false);
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error.code === '23505') {
        // eslint-disable-next-line
        if (error.detail.includes('phoneNumber')) {
          throw new BadRequestException(
            `Debtor with phone number '${createDebtorDto.phoneNumber}' already exists`,
          );
        }
        // eslint-disable-next-line
        if (error.detail.includes('companyName')) {
          throw new BadRequestException(
            `Debtor with company name '${createDebtorDto.companyName}' already exists`,
          );
        }
        // eslint-disable-next-line
        if (error.detail.includes('email')) {
          throw new BadRequestException(
            `Debtor with email '${createDebtorDto.email}' already exists`,
          );
        }
        // eslint-disable-next-line
        if (error.detail.includes('taxId')) {
          throw new BadRequestException(
            `Debtor with tax ID '${createDebtorDto.taxId}' already exists`,
          );
        }
      }
      throw new InternalServerErrorException(error);
    }
  }

  async findAll(query: GetDebtorsDto, user: User) {
    const queryBuilder = this.debtorRepository.createQueryBuilder('debtor');

    if (user.type === UserType.ADMIN) {
      queryBuilder.leftJoinAndSelect('debtor.documents', 'document');
      queryBuilder.leftJoinAndSelect('debtor.investor', 'investor');

      if (query.investorId) {
        queryBuilder.andWhere('debtor.investorId = :investorId', {
          investorId: query.investorId,
        });
      }

      if (query.status) {
        queryBuilder.andWhere('debtor.status = :status', {
          status: query.status,
        });
      }
    } else {
      queryBuilder.leftJoinAndSelect('debtor.investor', 'investor');
      queryBuilder.select([
        'debtor.id',
        'debtor.email',
        'debtor.phoneNumber',
        'debtor.companyName',
        'debtor.taxId',
      ]);

      queryBuilder.andWhere(
        '(debtor.investorId = :userId OR debtor.status = :verifiedStatus)',
        {
          userId: user.id,
          verifiedStatus: InvestorStatus.VERIFIED,
        },
      );
    }

    if (query.email) {
      queryBuilder.andWhere('debtor.email ILIKE :email', {
        email: `%${query.email}%`,
      });
    }

    if (query.phoneNumber) {
      queryBuilder.andWhere('debtor.phoneNumber ILIKE :phoneNumber', {
        phoneNumber: `%${query.phoneNumber}%`,
      });
    }

    if (query.companyName) {
      queryBuilder.andWhere('debtor.companyName ILIKE :companyName', {
        companyName: `%${query.companyName}%`,
      });
    }

    if (query.taxId) {
      queryBuilder.andWhere('debtor.taxId ILIKE :taxId', {
        taxId: `%${query.taxId}%`,
      });
    }

    if (query.status) {
      queryBuilder.andWhere('debtor.status = :status', {
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

  async findOne(id: string, user: User) {
    const queryBuilder = this.debtorRepository.createQueryBuilder('debtor');

    queryBuilder.leftJoinAndSelect('debtor.investor', 'investor');
    queryBuilder.where('debtor.id = :id', { id });

    if (user.type !== UserType.ADMIN) {
      queryBuilder.andWhere(
        '(debtor.investorId = :userId OR debtor.status = :verifiedStatus)',
        {
          userId: user.id,
          verifiedStatus: DebtorStatus.VERIFIED,
        },
      );
    }

    if (user.type === UserType.ADMIN) {
      queryBuilder.leftJoinAndSelect('debtor.documents', 'documents');
    } else {
      queryBuilder.leftJoinAndSelect(
        'debtor.documents',
        'documents',
        'debtor.investorId = :userId',
        { userId: user.id },
      );
    }

    const debtor = await queryBuilder.getOne();

    if (!debtor) {
      throw new NotFoundException(`Debtor with ID '${id}' not found`);
    }

    return debtor;
  }

  async update(
    id: string,
    updateDebtorDto: UpdateDebtorDto,
    files: { [key: string]: [Express.Multer.File | undefined] | undefined },
    user: User,
  ) {
    const debtor = await this.findOne(id, user);

    if (debtor.investor.id !== user.id && user.type !== UserType.ADMIN) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    let modelo111File =
      files[DocumentType.MODELO_111] && files[DocumentType.MODELO_111][0];
    let modelo303File =
      files[DocumentType.MODELO_303] && files[DocumentType.MODELO_303][0];

    let modelo111: Document | undefined;
    let modelo303: Document | undefined;

    if (user.type !== UserType.ADMIN) {
      if (debtor.status === DebtorStatus.CORRECTION) {
        if (
          updateDebtorDto.status &&
          updateDebtorDto.status.toLowerCase() ===
            DebtorStatus.PENDING.toLocaleLowerCase()
        ) {
          updateDebtorDto.status = DebtorStatus.PENDING;
          updateDebtorDto.lastCommunication =
            'Pendiente de revisión por usuario administrador';
        } else {
          updateDebtorDto.status = debtor.status;
          updateDebtorDto.lastCommunication = debtor.lastCommunication;
        }
      } else if (
        updateDebtorDto.status !== debtor.status &&
        (debtor.status !== DebtorStatus.CORRECTION ||
          updateDebtorDto.status !== DebtorStatus.PENDING)
      ) {
        throw new UnauthorizedException(
          "You don't have permissions to perform this action",
        );
      } else if (debtor.status === DebtorStatus.VERIFIED) {
        updateDebtorDto.companyName = debtor.companyName;
        updateDebtorDto.taxId = debtor.taxId;
        updateDebtorDto.status = debtor.status;
        updateDebtorDto.lastCommunication = debtor.lastCommunication;
        modelo111File = undefined;
        modelo303File = undefined;
      }
    } else {
      modelo111File = undefined;
      modelo303File = undefined;
    }

    try {
      if (user.type === UserType.INVESTOR) {
        if (modelo111File) {
          if (!updateDebtorDto.modelo111Csv) {
            throw new BadRequestException(
              'modelo111Csv is required when uploading a new file',
            );
          } else {
            modelo111 = await this.documentService.create(
              {
                title: `${debtor.companyName}'s Modelo 111`,
                value: updateDebtorDto.modelo111Csv,
                type: DocumentType.MODELO_111,
              },
              modelo111File,
              user,
              debtor,
            );

            if (!debtor.documents) {
              debtor.documents = [];
            }
            debtor.documents.push(modelo111);
          }
        }

        if (modelo303File) {
          if (!updateDebtorDto.modelo303Csv) {
            throw new BadRequestException(
              'modelo303Csv is required when uploading a new file',
            );
          } else {
            modelo303 = await this.documentService.create(
              {
                title: `${debtor.companyName}'s Modelo 303`,
                value: updateDebtorDto.modelo303Csv,
                type: DocumentType.MODELO_303,
              },
              modelo303File,
              user,
              debtor,
            );

            if (!debtor.documents) {
              debtor.documents = [];
            }
            debtor.documents.push(modelo303);
          }
        }
      }

      Object.assign(debtor, updateDebtorDto.removeUndefined());
      return await this.debtorRepository.save(debtor);
    } catch (error) {
      console.error(error);
      if (modelo111) {
        await this.documentService.deleteFile(modelo111.filename);
        await this.documentService.remove(modelo111.id, user, false);
      }
      if (modelo303) {
        await this.documentService.deleteFile(modelo303.filename);
        await this.documentService.remove(modelo303.id, user, false);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error.code === '23505') {
        // eslint-disable-next-line
        if (error.detail.includes('phoneNumber')) {
          throw new BadRequestException(
            `Debtor with phone number '${updateDebtorDto.phoneNumber}' already exists`,
          );
        }
        // eslint-disable-next-line
        if (error.detail.includes('companyName')) {
          throw new BadRequestException(
            `Debtor with company name '${updateDebtorDto.companyName}' already exists`,
          );
        }
        // eslint-disable-next-line
        if (error.detail.includes('email')) {
          throw new BadRequestException(
            `Debtor with email '${updateDebtorDto.email}' already exists`,
          );
        }
        // eslint-disable-next-line
        if (error.detail.includes('taxId')) {
          throw new BadRequestException(
            `Debtor with tax ID '${updateDebtorDto.taxId}' already exists`,
          );
        }
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error instanceof ForbiddenException) {
        throw error;
      }

      throw new InternalServerErrorException(error);
    }
  }

  async remove(id: string, user: User, useSoft = true) {
    const debtor = await this.findOne(id, user);

    if (debtor.investor.id !== user.id) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    if (useSoft) {
      return await this.debtorRepository.softDelete(id);
    } else {
      return await this.debtorRepository.delete(id);
    }
  }
}
