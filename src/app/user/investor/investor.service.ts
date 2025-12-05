import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { BankAccountService } from 'src/app/bank-account/bank-account.service';
import { DocumentService } from 'src/app/document/document.service';
import { Repository } from 'typeorm';
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

    const queryRunner =
      this.investorRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let documentPath: string | null = null;
    try {
      createInvestorDto.password = await bcrypt.hash(
        createInvestorDto.password,
        10,
      );

      const document = await this.documentService.create(
        {
          title: `${createInvestorDto.companyName}'s ID document`,
          value: createInvestorDto.documentValue,
        },
        documentFile,
      );

      const bankAccount = await this.bankAccountService.create({});

      const investor = queryRunner.manager.create(Investor, {
        ...createInvestorDto,
        document: document,
        bankAccount: bankAccount,
      });

      const savedInvestor = await queryRunner.manager.save(investor);
      documentPath = await this.documentService.uploadFile(
        documentFile,
        document.id,
      );

      await queryRunner.commitTransaction();
      return savedInvestor;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (documentPath) {
        await this.documentService.deleteFile(documentPath);
      }

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
    } finally {
      await queryRunner.release();
    }
  }

  async findAll() {
    return await this.investorRepository.find();
  }

  async findOne(id: string) {
    const investor = await this.investorRepository.findOne({ where: { id } });

    if (!investor) {
      throw new NotFoundException(`Investor with id '${id}' not found`);
    }

    return investor;
  }

  async update(
    id: string,
    updateInvestorDto: UpdateInvestorDto,
    file: Express.Multer.File,
  ) {
    if (updateInvestorDto.password && updateInvestorDto.passwordRepeat) {
      if (updateInvestorDto.password !== updateInvestorDto.passwordRepeat) {
        throw new BadRequestException('Passwords do not match');
      }
    }

    const investor = await this.findOne(id);

    const queryRunner =
      this.investorRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let documentPath: string | null = null;
    try {
      if (updateInvestorDto.password) {
        updateInvestorDto.password = await bcrypt.hash(
          updateInvestorDto.password,
          10,
        );
      }

      if (file && !investor.document)
        throw new BadRequestException(
          'Document value is required when uploading a new document file',
        );

      if (file && investor.document) {
        investor.document = await this.documentService.create(
          {
            title: `${investor.companyName}'s ID document`,
            value: updateInvestorDto.documentValue!,
          },
          file,
        );

        documentPath = await this.documentService.uploadFile(
          file,
          investor.document.id,
        );
      }

      queryRunner.manager.merge(
        Investor,
        investor,
        updateInvestorDto.removeUndefined(),
      );
      const updatedInvestor = await queryRunner.manager.save(investor);

      await queryRunner.commitTransaction();
      return updatedInvestor;
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (documentPath) {
        await this.documentService.deleteFile(documentPath);
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
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.investorRepository.softDelete(id);
  }
}
