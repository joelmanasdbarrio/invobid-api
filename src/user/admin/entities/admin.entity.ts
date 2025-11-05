import { User } from 'src/user/common/entities/user.entity';
import { Entity } from 'typeorm';

@Entity('admins')
export class Admin extends User {}
