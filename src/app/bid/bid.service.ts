import { Injectable } from '@nestjs/common';
import { User } from '../user/common/entities/user.entity';
import { CreateBidDto } from './dto/create-bid.dto';

@Injectable()
export class BidService {
  create(createBidDto: CreateBidDto, user: User) {
    return 'This action adds a new bid';
  }

  findAll() {
    return `This action returns all bid`;
  }

  findOne(id: string) {
    return `This action returns a #${id} bid`;
  }
}
