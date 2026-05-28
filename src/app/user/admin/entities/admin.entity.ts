import { User } from 'src/app/user/common/entities/user.entity';
import { ChildEntity } from 'typeorm';

@ChildEntity('admin')
export class Admin extends User {}
