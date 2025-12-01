import { Injectable } from '@nestjs/common';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';

@Injectable()
export class AuctionService {
  create(createAuctionDto: CreateAuctionDto) {
    return 'This action adds a new auction';
  }

  findAll() {
    return `This action returns all auction`;
  }

  findOne(id: string) {
    return `This action returns a #${id} auction`;
  }

  update(id: string, updateAuctionDto: UpdateAuctionDto) {
    return `This action updates a #${id} auction`;
  }

  remove(id: string) {
    return `This action removes a #${id} auction`;
  }
}
