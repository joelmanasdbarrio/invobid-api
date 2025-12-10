import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Auth } from '../user/auth/decorators/auth.decorator';
import { GetUser } from '../user/auth/decorators/get-user.decorator';
import { User } from '../user/common/entities/user.entity';
import { UserType } from '../user/common/enums/user-type.enum';
import { InvestorType } from '../user/investor/enums/investor-type.enum';
import { AuctionService } from './auction.service';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';

@Controller('auction')
export class AuctionController {
  constructor(private readonly auctionService: AuctionService) {}

  @Post()
  @Auth([InvestorType.COMPANY])
  create(@Body() createAuctionDto: CreateAuctionDto, @GetUser() user: User) {
    return this.auctionService.create(createAuctionDto, user);
  }

  @Get()
  @Auth()
  findAll() {
    return this.auctionService.findAll();
  }

  @Get(':id')
  @Auth()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.auctionService.findOne(id);
  }

  @Patch(':id')
  @Auth([UserType.ADMIN, InvestorType.COMPANY])
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAuctionDto: UpdateAuctionDto,
    @GetUser() user: User,
  ) {
    return this.auctionService.update(id, updateAuctionDto, user);
  }

  @Delete(':id')
  @Auth([UserType.ADMIN, InvestorType.COMPANY])
  remove(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.auctionService.remove(id, user);
  }
}
