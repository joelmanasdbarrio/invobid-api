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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @Column()
  type: 'supplier' | 'investor' | 'admin';

  @BeforeInsert()
  normalizeEmailOnInsert() {
    this.email = this.email.toLowerCase().trim();
  }

  @BeforeUpdate()
  normalizeEmailOnUpdate() {
    if (this.email) {
      this.email = this.email.toLowerCase().trim();
    }
  }
}
