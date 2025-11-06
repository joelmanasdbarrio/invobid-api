import { User } from 'src/user/common/entities/user.entity';
import { ChildEntity, Entity } from 'typeorm';

@Entity('admins')
@ChildEntity('admin')
export class Admin extends User {}
