import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  TableInheritance,
  UpdateDateColumn,
} from 'typeorm';
import { UserType } from '../enums/user-type.enum';

@Entity('users')
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export abstract class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { unique: true })
  email: string;

  @Column('text', { select: false })
  password: string;

  @Column('text')
  name: string;

  @Column('bool', { default: true, select: false })
  isActive: boolean;

  @CreateDateColumn({ select: false })
  createdAt: Date;

  @UpdateDateColumn({ select: false })
  updatedAt: Date;

  @DeleteDateColumn({ select: false })
  deletedAt: Date;

  @Column()
  type: UserType;

  @BeforeInsert()
  normalizeEmailOnInsert() {
    this.email = this.email.toLowerCase().trim();
  }

  @BeforeInsert()
  normalizeNameOnInsert() {
    this.name = this.name.trim();
  }

  @BeforeUpdate()
  normalizeEmailOnUpdate() {
    if (this.email) {
      this.email = this.email.toLowerCase().trim();
    }
  }

  @BeforeUpdate()
  normalizeNameOnUpdate() {
    if (this.name) {
      this.name = this.name.trim();
    }
  }
}
