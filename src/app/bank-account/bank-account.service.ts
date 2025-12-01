import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { BankAccount } from './entities/bank-account.entity';

@Injectable()
export class BankAccountService {
  constructor(
    @InjectRepository(BankAccount)
    private bankAccountRepository: Repository<BankAccount>,
  ) {}

  async create(createBankAccountDto: CreateBankAccountDto) {
    const bankAccount = this.bankAccountRepository.create(createBankAccountDto);
    return await this.bankAccountRepository.save(bankAccount);
  }

  findAll() {
    return this.bankAccountRepository.find();
  }

  findOne(id: string) {
    return this.bankAccountRepository.findOne({ where: { id } });
  }

  update(id: string, updateBankAccountDto: UpdateBankAccountDto) {
    return this.bankAccountRepository.update(id, updateBankAccountDto);
  }

  remove(id: string) {
    return this.bankAccountRepository.delete(id);
  }
}
