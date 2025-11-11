import { User } from 'src/user/common/entities/user.entity';
import { ChildEntity } from 'typeorm';

@ChildEntity('admin')
export class Admin extends User {}
