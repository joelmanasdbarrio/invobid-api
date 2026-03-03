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

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true, type: 'timestamptz' })
  deletedAt: Date | null;

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
