import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GetDebtorsDto } from 'src/app/debtor/dto/get-debtors.dto';
import { Debtor } from 'src/app/debtor/entities/debtor.entity';
import { DocumentService } from 'src/app/document/document.service';
import { Document } from 'src/app/document/entities/document.entity';
import { DocumentType } from 'src/app/document/enums/document-type.enum';
import { User } from 'src/app/user/common/entities/user.entity';
import { UserType } from 'src/app/user/common/enums/user-type.enum';
import { Investor } from 'src/app/user/investor/entities/investor.entity';
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
        'Both 111 and 303 AEAT documents are required.',
      );
    }

    let debtor: Debtor | undefined;
    let modelo111: Document | undefined;
    let modelo303: Document | undefined;
    try {
      debtor = await this.debtorRepository.save({
        ...createDebtorDto,
        investor,
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
            `You already have a debtor with phone number '${createDebtorDto.phoneNumber}'`,
          );
        }
        // eslint-disable-next-line
        if (error.detail.includes('companyName')) {
          throw new BadRequestException(
            `You already have a debtor with company name '${createDebtorDto.companyName}'`,
          );
        }
        // eslint-disable-next-line
        if (error.detail.includes('email')) {
          throw new BadRequestException(
            `You already have a debtor with email '${createDebtorDto.email}'`,
          );
        }
        // eslint-disable-next-line
        if (error.detail.includes('taxId')) {
          throw new BadRequestException(
            `You already have a debtor with tax ID '${createDebtorDto.taxId}'`,
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
    } else {
      queryBuilder.leftJoin('debtor.documents', 'document');
      queryBuilder.andWhere('debtor.investorId = :investorId', {
        investorId: user.id,
      });
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

    const total = await queryBuilder.getCount();

    if (query.page && query.limit) {
      const skip = (query.page - 1) * query.limit;
      queryBuilder.skip(skip).take(query.limit);
    }

    const data = await queryBuilder.getMany();

    return { data, total, page: query.page, limit: query.limit };
  }

  async findOne(id: string, user: User) {
    const debtor = await (async () => {
      if (user.type === UserType.ADMIN) {
        return this.debtorRepository.findOne({
          where: { id },
          relations: ['documents', 'investor'],
        });
      } else {
        return this.debtorRepository.findOne({
          where: { id, investor: { id: user.id } },
        });
      }
    })();

    if (!debtor) {
      throw new NotFoundException(`Debtor with ID '${id}' not found`);
    }

    return debtor;
  }

  async update(
    id: string,
    updateDebtorDto: UpdateDebtorDto,
    files: { [key: string]: Express.Multer.File[] },
    investor: Investor,
  ) {
    const modelo111File =
      files[DocumentType.MODELO_111] && files[DocumentType.MODELO_111][0];
    const modelo303File =
      files[DocumentType.MODELO_303] && files[DocumentType.MODELO_303][0];

    let modelo111: Document | undefined;
    let modelo303: Document | undefined;
    try {
      const debtor = await this.findOne(id, investor);

      if (modelo111File) {
        if (!updateDebtorDto.modelo111Csv) {
          throw new BadRequestException(
            'Modelo 111 CSV content is required when uploading a new file.',
          );
        } else {
          modelo111 = await this.documentService.create(
            {
              title: `${debtor.companyName}'s Modelo 111`,
              value: updateDebtorDto.modelo111Csv,
              type: DocumentType.MODELO_111,
            },
            modelo111File,
            investor,
            debtor,
          );
        }
      }

      if (modelo303File) {
        if (!updateDebtorDto.modelo303Csv) {
          throw new BadRequestException(
            'Modelo 303 CSV content is required when uploading a new file.',
          );
        } else {
          modelo303 = await this.documentService.create(
            {
              title: `${debtor.companyName}'s Modelo 303`,
              value: updateDebtorDto.modelo303Csv,
              type: DocumentType.MODELO_303,
            },
            modelo303File,
            investor,
            debtor,
          );
        }
      }

      Object.assign(debtor, updateDebtorDto.removeUndefined());
      return await this.debtorRepository.save(debtor);
    } catch (error) {
      console.error(error);
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
            `You already have a debtor with phone number '${updateDebtorDto.phoneNumber}'`,
          );
        }
        // eslint-disable-next-line
        if (error.detail.includes('companyName')) {
          throw new BadRequestException(
            `You already have a debtor with company name '${updateDebtorDto.companyName}'`,
          );
        }
        // eslint-disable-next-line
        if (error.detail.includes('email')) {
          throw new BadRequestException(
            `You already have a debtor with email '${updateDebtorDto.email}'`,
          );
        }
        // eslint-disable-next-line
        if (error.detail.includes('taxId')) {
          throw new BadRequestException(
            `You already have a debtor with tax ID '${updateDebtorDto.taxId}'`,
          );
        }
      }
      throw new InternalServerErrorException(error);
    }

    return `This action updates a #${id} debtor`;
  }

  async remove(id: string, useSoft = true) {
    if (useSoft) {
      return await this.debtorRepository.softDelete(id);
    } else {
      return await this.debtorRepository.delete(id);
    }
  }
}
