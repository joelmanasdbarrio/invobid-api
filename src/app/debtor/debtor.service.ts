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
import { User } from 'src/app/user/common/entities/user.entity';
import { UserType } from 'src/app/user/common/enums/user-type.enum';
import { Investor } from 'src/app/user/investor/entities/investor.entity';
import { Repository } from 'typeorm';
import { CreateDebtorDto } from './dto/create-debtor.dto';
import { UpdateDebtorDto } from './dto/update-debtor.dto';
import { DebtorStatus } from './enums/debtor-status.enum';

@Injectable()
export class DebtorService {
  constructor(
    @InjectRepository(Debtor)
    private readonly debtorRepository: Repository<Debtor>,
    // private readonly documentService: DocumentService,
  ) {}

  async create(
    createDebtorDto: CreateDebtorDto,
    // files: { [key: string]: Express.Multer.File[] },
    investor: Investor,
  ) {
    // const modelo111FileQuarterly =
    //   files[DocumentType.TAX_111_QUARTERLY] &&
    //   files[DocumentType.TAX_111_QUARTERLY][0];

    // const modelo111FileAnnual =
    //   files[DocumentType.TAX_111_ANNUAL] &&
    //   files[DocumentType.TAX_111_ANNUAL][0];

    // const modelo303FileQuarterly =
    //   files[DocumentType.TAX_303_QUARTERLY] &&
    //   files[DocumentType.TAX_303_QUARTERLY][0];

    // const modelo303FileAnnual =
    //   files[DocumentType.TAX_303_ANNUAL] &&
    //   files[DocumentType.TAX_303_ANNUAL][0];

    // if (
    //   !modelo111FileQuarterly ||
    //   !modelo111FileAnnual ||
    //   !modelo303FileQuarterly ||
    //   !modelo303FileAnnual
    // ) {
    //   throw new BadRequestException(
    //     `${DocumentType.TAX_111_QUARTERLY}, ${DocumentType.TAX_111_ANNUAL}, ${DocumentType.TAX_303_QUARTERLY}, and ${DocumentType.TAX_303_ANNUAL} must be valid AEAT documents`,
    //   );
    // }

    let debtor: Debtor | undefined;
    // let modelo111Quarterly: Document | undefined;
    // let modelo111Annual: Document | undefined;
    // let modelo303Quarterly: Document | undefined;
    // let modelo303Annual: Document | undefined;
    try {
      debtor = await this.debtorRepository.save({
        ...createDebtorDto,
        investor,
        lastCommunication: 'Pendiente de revisión por usuario administrador',
      });

      // modelo111Quarterly = await this.documentService.create(
      //   {
      //     title: `${createDebtorDto.companyName}'s Modelo 111 trimestral`,
      //     value: createDebtorDto.modelo111QuarterlyCsv,
      //     type: DocumentType.TAX_111_QUARTERLY,
      //   },
      //   modelo111FileQuarterly,
      //   investor,
      //   debtor,
      // );

      // modelo111Annual = await this.documentService.create(
      //   {
      //     title: `${createDebtorDto.companyName}'s Modelo 111 anual`,
      //     value: createDebtorDto.modelo111AnnualCsv,
      //     type: DocumentType.TAX_111_ANNUAL,
      //   },
      //   modelo111FileAnnual,
      //   investor,
      //   debtor,
      // );

      // modelo303Quarterly = await this.documentService.create(
      //   {
      //     title: `${createDebtorDto.companyName}'s Modelo 303 trimestral`,
      //     value: createDebtorDto.modelo303QuarterlyCsv,
      //     type: DocumentType.TAX_303_QUARTERLY,
      //   },
      //   modelo303FileQuarterly,
      //   investor,
      //   debtor,
      // );

      // modelo303Annual = await this.documentService.create(
      //   {
      //     title: `${createDebtorDto.companyName}'s Modelo 303 anual`,
      //     value: createDebtorDto.modelo303AnnualCsv,
      //     type: DocumentType.TAX_303_ANNUAL,
      //   },
      //   modelo303FileAnnual,
      //   investor,
      //   debtor,
      // );

      // debtor.documents = [
      //   modelo111Quarterly,
      //   modelo111Annual,
      //   modelo303Quarterly,
      //   modelo303Annual,
      // ];
      await this.debtorRepository.save(debtor);

      return debtor;
    } catch (error) {
      console.error(error);
      if (debtor) {
        await this.debtorRepository.delete(debtor.id);
      }
      // if (modelo111Quarterly) {
      //   await this.documentService.deleteFile(modelo111Quarterly.filename);
      //   await this.documentService.remove(
      //     modelo111Quarterly.id,
      //     investor,
      //     false,
      //   );
      // }
      // if (modelo111Annual) {
      //   await this.documentService.deleteFile(modelo111Annual.filename);
      //   await this.documentService.remove(modelo111Annual.id, investor, false);
      // }
      // if (modelo303Quarterly) {
      //   await this.documentService.deleteFile(modelo303Quarterly.filename);
      //   await this.documentService.remove(
      //     modelo303Quarterly.id,
      //     investor,
      //     false,
      //   );
      // }
      // if (modelo303Annual) {
      //   await this.documentService.deleteFile(modelo303Annual.filename);
      //   await this.documentService.remove(modelo303Annual.id, investor, false);
      // }
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
    const queryBuilder = this.debtorRepository
      .createQueryBuilder('debtor')
      .leftJoinAndSelect('debtor.investor', 'investor');

    if (user.type === UserType.ADMIN) {
      // queryBuilder.leftJoinAndSelect('debtor.documents', 'documents');

      if (query.status) {
        queryBuilder.andWhere('(debtor.status = :status)', {
          status: query.status,
        });
      }

      if (query.includeDeleted && query.includeDeleted > 0) {
        queryBuilder.withDeleted();
      }
    } else {
      queryBuilder.andWhere(
        '(debtor.investorId = :userId OR debtor.status = :verifiedStatus)',
        {
          userId: user.id,
          verifiedStatus: DebtorStatus.VERIFIED,
        },
      );

      if (query.includeDeleted && query.includeDeleted > 0) {
        queryBuilder.withDeleted();
        queryBuilder.andWhere(
          '(debtor.investorId = :userId OR debtor.deletedAt IS NULL)',
          {
            userId: user.id,
          },
        );
      }
    }

    if (query.investorId) {
      queryBuilder.andWhere('(debtor.investorId = :investorId)', {
        investorId: query.investorId,
      });
    }

    if (query.email) {
      queryBuilder.andWhere('(debtor.email ILIKE :email)', {
        email: `%${query.email}%`,
      });
    }

    if (query.phoneNumber) {
      queryBuilder.andWhere('(debtor.phoneNumber ILIKE :phoneNumber)', {
        phoneNumber: `%${query.phoneNumber}%`,
      });
    }

    if (query.companyName) {
      queryBuilder.andWhere('(debtor.companyName ILIKE :companyName)', {
        companyName: `%${query.companyName}%`,
      });
    }

    if (query.taxId) {
      queryBuilder.andWhere('(debtor.taxId ILIKE :taxId)', {
        taxId: `%${query.taxId}%`,
      });
    }

    if (query.status) {
      queryBuilder.andWhere('(debtor.status = :status)', {
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
    const queryBuilder = this.debtorRepository
      .createQueryBuilder('debtor')
      .leftJoinAndSelect('debtor.investor', 'investor')
      .where('debtor.id = :id', { id });

    if (user.type !== UserType.ADMIN) {
      queryBuilder.andWhere(
        '(debtor.investorId = :userId OR debtor.status = :verifiedStatus)',
        {
          userId: user.id,
          verifiedStatus: DebtorStatus.VERIFIED,
        },
      );
    }

    // if (user.type === UserType.ADMIN) {
    //   queryBuilder.leftJoinAndSelect('debtor.documents', 'documents');
    // } else {
    //   queryBuilder.leftJoinAndSelect(
    //     'debtor.documents',
    //     'documents',
    //     'debtor.investorId = :userId',
    //     { userId: user.id },
    //   );
    // }

    const debtor = await queryBuilder.getOne();

    if (!debtor) {
      throw new NotFoundException(`Debtor with ID '${id}' not found`);
    }

    return debtor;
  }

  async update(
    id: string,
    updateDebtorDto: UpdateDebtorDto,
    // files: {
    //   [key: string]: [Express.Multer.File | undefined] | undefined;
    // } = {},
    user: User,
  ) {
    const debtor: Debtor = await this.findOne(id, user);

    if (debtor.investor.id !== user.id && user.type !== UserType.ADMIN) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    // let modelo111FileQuarterly =
    //   files[DocumentType.TAX_111_QUARTERLY] &&
    //   files[DocumentType.TAX_111_QUARTERLY][0];
    // let modelo111FileAnnual =
    //   files[DocumentType.TAX_111_ANNUAL] &&
    //   files[DocumentType.TAX_111_ANNUAL][0];
    // let modelo303FileQuarterly =
    //   files[DocumentType.TAX_303_QUARTERLY] &&
    //   files[DocumentType.TAX_303_QUARTERLY][0];
    // let modelo303FileAnnual =
    //   files[DocumentType.TAX_303_ANNUAL] &&
    //   files[DocumentType.TAX_303_ANNUAL][0];

    // let modelo111Quarterly: Document | undefined;
    // let modelo111Annual: Document | undefined;
    // let modelo303Quarterly: Document | undefined;
    // let modelo303Annual: Document | undefined;

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
        updateDebtorDto.status !== DebtorStatus.PENDING
      ) {
        throw new UnauthorizedException(
          "You don't have permissions to perform this action",
        );
      } else if (debtor.status === DebtorStatus.VERIFIED) {
        updateDebtorDto.companyName = debtor.companyName;
        updateDebtorDto.taxId = debtor.taxId;
        updateDebtorDto.status = debtor.status;
        updateDebtorDto.lastCommunication = debtor.lastCommunication;
        // modelo111FileQuarterly = undefined;
        // modelo111FileAnnual = undefined;
        // modelo303FileQuarterly = undefined;
        // modelo303FileAnnual = undefined;
      }
    } else {
      // modelo111FileQuarterly = undefined;
      // modelo111FileAnnual = undefined;
      // modelo303FileQuarterly = undefined;
      // modelo303FileAnnual = undefined;
    }

    try {
      // if (user.type === UserType.INVESTOR) {
      //   if (modelo111FileQuarterly) {
      //     if (!updateDebtorDto.modelo111QuarterlyCsv) {
      //       throw new BadRequestException(
      //         'modelo111QuarterlyCsv is required when uploading a new file',
      //       );
      //     } else {
      //       modelo111Quarterly = await this.documentService.create(
      //         {
      //           title: `${debtor.companyName}'s Modelo 111 Quarterly`,
      //           value: updateDebtorDto.modelo111QuarterlyCsv,
      //           type: DocumentType.TAX_111_QUARTERLY,
      //         },
      //         modelo111FileQuarterly,
      //         user,
      //         debtor,
      //       );

      //       if (!debtor.documents) {
      //         debtor.documents = [];
      //       }
      //       debtor.documents.push(modelo111Quarterly);
      //     }
      //   }

      //   if (modelo111FileAnnual) {
      //     if (!updateDebtorDto.modelo111AnnualCsv) {
      //       throw new BadRequestException(
      //         'modelo111AnnualCsv is required when uploading a new file',
      //       );
      //     } else {
      //       modelo111Annual = await this.documentService.create(
      //         {
      //           title: `${debtor.companyName}'s Modelo 111 Annual`,
      //           value: updateDebtorDto.modelo111AnnualCsv,
      //           type: DocumentType.TAX_111_ANNUAL,
      //         },
      //         modelo111FileAnnual,
      //         user,
      //         debtor,
      //       );

      //       if (!debtor.documents) {
      //         debtor.documents = [];
      //       }
      //       debtor.documents.push(modelo111Annual);
      //     }
      //   }

      //   if (modelo303FileQuarterly) {
      //     if (!updateDebtorDto.modelo303QuarterlyCsv) {
      //       throw new BadRequestException(
      //         'modelo303QuarterlyCsv is required when uploading a new file',
      //       );
      //     } else {
      //       modelo303Quarterly = await this.documentService.create(
      //         {
      //           title: `${debtor.companyName}'s Modelo 303 Quarterly`,
      //           value: updateDebtorDto.modelo303QuarterlyCsv,
      //           type: DocumentType.TAX_303_QUARTERLY,
      //         },
      //         modelo303FileQuarterly,
      //         user,
      //         debtor,
      //       );

      //       if (!debtor.documents) {
      //         debtor.documents = [];
      //       }
      //       debtor.documents.push(modelo303Quarterly);
      //     }
      //   }

      //   if (modelo303FileAnnual) {
      //     if (!updateDebtorDto.modelo303AnnualCsv) {
      //       throw new BadRequestException(
      //         'modelo303AnnualCsv is required when uploading a new file',
      //       );
      //     } else {
      //       modelo303Annual = await this.documentService.create(
      //         {
      //           title: `${debtor.companyName}'s Modelo 303 Annual`,
      //           value: updateDebtorDto.modelo303AnnualCsv,
      //           type: DocumentType.TAX_303_ANNUAL,
      //         },
      //         modelo303FileAnnual,
      //         user,
      //         debtor,
      //       );

      //       if (!debtor.documents) {
      //         debtor.documents = [];
      //       }
      //       debtor.documents.push(modelo303Annual);
      //     }
      //   }
      // }

      Object.assign(debtor, updateDebtorDto.removeUndefined());
      return await this.debtorRepository.save(debtor);
    } catch (error) {
      console.error(error);
      // if (modelo111Quarterly) {
      //   await this.documentService.deleteFile(modelo111Quarterly.filename);
      //   await this.documentService.remove(modelo111Quarterly.id, user, false);
      // }
      // if (modelo111Annual) {
      //   await this.documentService.deleteFile(modelo111Annual.filename);
      //   await this.documentService.remove(modelo111Annual.id, user, false);
      // }
      // if (modelo303Quarterly) {
      //   await this.documentService.deleteFile(modelo303Quarterly.filename);
      //   await this.documentService.remove(modelo303Quarterly.id, user, false);
      // }
      // if (modelo303Annual) {
      //   await this.documentService.deleteFile(modelo303Annual.filename);
      //   await this.documentService.remove(modelo303Annual.id, user, false);
      // }

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
      } else {
        throw new InternalServerErrorException(error);
      }
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
