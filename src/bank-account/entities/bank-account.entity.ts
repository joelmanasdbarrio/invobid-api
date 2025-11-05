import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('bank_accounts')
export class BankAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('numeric', { default: 0 })
  balance: number;
}
