import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { BankAccountService } from 'src/app/bank-account/bank-account.service';
import { DocumentService } from 'src/app/document/document.service';
import { IStorageService } from 'src/storage/interfaces/storage.interface';
import { Repository } from 'typeorm';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Supplier } from './entities/supplier.entity';

@Injectable()
export class SupplierService {
  constructor(
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
    private readonly documentService: DocumentService,
    private readonly bankAccountService: BankAccountService,
    @Inject('STORAGE_SERVICE')
    private readonly publicStorageService: IStorageService,
  ) {}

  async create(
    createSupplierDto: CreateSupplierDto,
    files?: { document?: Express.Multer.File[]; logo?: Express.Multer.File[] },
  ) {
    if (createSupplierDto.password !== createSupplierDto.passwordRepeat) {
      throw new BadRequestException('Passwords do not match');
    }

    const documentFile = files?.document ? files.document[0] : undefined;
    if (!documentFile) {
      throw new BadRequestException('Document file is required');
    }

    const logoFile = files?.logo ? files.logo[0] : undefined;
    if (!logoFile) {
      throw new BadRequestException('Logo file is required');
    }

    const queryRunner =
      this.supplierRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let documentPath: string | null = null;
    let logoPath: string | null = null;
    try {
      createSupplierDto.password = await bcrypt.hash(
        createSupplierDto.password,
        10,
      );

      const document = await this.documentService.create(
        {
          title: `${createSupplierDto.companyName}'s ID document`,
          value: createSupplierDto.documentValue,
        },
        documentFile,
      );

      const bankAccount = await this.bankAccountService.create({});

      const supplier = queryRunner.manager.create(Supplier, {
        ...createSupplierDto,
        document,
        bankAccount,
      });

      const savedSupplier = await queryRunner.manager.save(supplier);
      documentPath = await this.documentService.uploadFile(
        documentFile,
        String(document.id),
      );

      logoPath = await this.publicStorageService.uploadFile(logoFile);
      savedSupplier.logo = logoPath;

      await queryRunner.commitTransaction();

      return savedSupplier;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (documentPath) {
        await this.documentService.deleteFile(documentPath);
      }

      if (logoPath) {
        await this.publicStorageService.deleteFile(logoPath);
      }

      console.error(error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error.code === '23505') {
        // eslint-disable-next-line
        if (error.detail.includes('phoneNumber')) {
          throw new BadRequestException(
            `Supplier with phone number '${createSupplierDto.phoneNumber}' already exists`,
          );
        }
        // eslint-disable-next-line
        if (error.detail.includes('companyName')) {
          throw new BadRequestException(
            `Supplier with company name '${createSupplierDto.companyName}' already exists`,
          );
        }
        // eslint-disable-next-line
        if (error.detail.includes('email')) {
          throw new BadRequestException(
            `User with email '${createSupplierDto.email}' already exists`,
          );
        }
      }
      throw new InternalServerErrorException(error);
    } finally {
      await queryRunner.release();
    }
  }

  async findAll() {
    return await this.supplierRepository.find();
  }

  async findOne(id: string) {
    const supplier = await this.supplierRepository.findOne({ where: { id } });

    if (!supplier)
      throw new NotFoundException(`Supplier with ID '${id}' not found`);

    return supplier;
  }

  async update(
    id: string,
    updateSupplierDto: UpdateSupplierDto,
    files?: { document?: Express.Multer.File[]; logo?: Express.Multer.File[] },
  ) {
    if (updateSupplierDto.password && updateSupplierDto.passwordRepeat) {
      if (updateSupplierDto.password !== updateSupplierDto.passwordRepeat) {
        throw new BadRequestException('Passwords do not match');
      }
    }

    const supplier = await this.findOne(id);

    const queryRunner =
      this.supplierRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let documentPath: string | null = null;
    let logoPath: string | null = null;
    try {
      if (updateSupplierDto.password) {
        updateSupplierDto.password = await bcrypt.hash(
          updateSupplierDto.password,
          10,
        );
      }

      const documentFile = files?.document ? files.document[0] : undefined;
      if (documentFile) {
        supplier.document = await this.documentService.create(
          {
            title: `${supplier.companyName}'s ID document`,
            value: updateSupplierDto.documentValue,
          },
          documentFile,
        );

        documentPath = await this.documentService.uploadFile(
          documentFile,
          supplier.document.id,
        );
      }

      const logoFile = files?.logo ? files.logo[0] : undefined;
      if (logoFile) {
        if (supplier.logo) {
          await this.publicStorageService.deleteFile(supplier.logo);
        }

        logoPath = await this.publicStorageService.uploadFile(logoFile);
        supplier.logo = logoPath;
      }

      queryRunner.manager.merge(
        Supplier,
        supplier,
        updateSupplierDto.removeUndefined(),
      );

      await queryRunner.manager.save(supplier);
      await queryRunner.commitTransaction();

      return supplier;
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (documentPath) {
        await this.publicStorageService.deleteFile(documentPath);
      }

      if (logoPath) {
        await this.publicStorageService.deleteFile(logoPath);
      }

      console.error(error);
      throw new InternalServerErrorException(error);
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.supplierRepository.softDelete(id);
  }
}
