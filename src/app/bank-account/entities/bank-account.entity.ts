import { Admin } from 'src/app/user/admin/entities/admin.entity';
import { Investor } from 'src/app/user/investor/entities/investor.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('bank_accounts')
@Index('platform_unique_idx', ['platform'], {
  where: '"platform" = true',
  unique: true,
})
export class BankAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  balance: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  reservedBalance: number;

  @Column('bool', { default: false })
  platform: boolean;

  @OneToOne(() => Investor, (investor) => investor.bankAccount, {
    nullable: true,
  })
  investor: Investor;

  @OneToMany(() => Admin, (admin) => admin.bankAccount)
  admins: Admin[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
