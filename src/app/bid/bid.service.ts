import { Injectable } from '@nestjs/common';
import { CreateBidDto } from './dto/create-bid.dto';
import { UpdateBidDto } from './dto/update-bid.dto';

@Injectable()
export class BidService {
  create(createBidDto: CreateBidDto) {
    return 'This action adds a new bid';
  }

  findAll() {
    return `This action returns all bid`;
  }

  findOne(id: string) {
    return `This action returns a #${id} bid`;
  }

  update(id: string, updateBidDto: UpdateBidDto) {
    return `This action updates a #${id} bid`;
  }

  remove(id: string) {
    return `This action removes a #${id} bid`;
  }
}
