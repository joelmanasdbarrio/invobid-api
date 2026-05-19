import { BankAccount } from 'src/app/bank-account/entities/bank-account.entity';
import { User } from 'src/app/user/common/entities/user.entity';
import { ChildEntity, JoinColumn, ManyToOne } from 'typeorm';

@ChildEntity('admin')
export class Admin extends User {
  @ManyToOne(() => BankAccount, (bankAccount) => bankAccount.admins, {
    nullable: true,
  })
  @JoinColumn()
  bankAccount: BankAccount;
}
