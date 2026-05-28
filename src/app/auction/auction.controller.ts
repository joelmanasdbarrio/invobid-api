import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Auth } from '../user/auth/decorators/auth.decorator';
import { GetUser } from '../user/auth/decorators/get-user.decorator';
import { User } from '../user/common/entities/user.entity';
import { UserType } from '../user/common/enums/user-type.enum';
import { Investor } from '../user/investor/entities/investor.entity';
import { InvestorStatus } from '../user/investor/enums/investor-status.enum';
import { InvestorType } from '../user/investor/enums/investor-type.enum';
import { AuctionService } from './auction.service';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { GetAuctionsDto } from './dto/get-auctions.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';

@Controller('auctions')
export class AuctionController {
  constructor(private readonly auctionService: AuctionService) {}

  @Post()
  @Auth([InvestorType.COMPANY], [InvestorStatus.VERIFIED])
  async create(
    @Body() createAuctionDto: CreateAuctionDto,
    @GetUser() user: Investor,
  ) {
    const auction = await this.auctionService.create(createAuctionDto, user);

    return {
      status: 'success',
      data: auction,
    };
  }

  @Get()
  @Auth([], [InvestorStatus.VERIFIED])
  async findAll(@Query() query: GetAuctionsDto, @GetUser() user: User) {
    const { data, total, page, limit } = await this.auctionService.findAll(
      {
        ...query,
        page: query.page || 1,
        limit: query.limit || 10,
      },
      user,
    );

    return {
      status: 'success',
      data,
      _metadata: {
        total,
        length: data.length,
        page,
        limit,
      },
    };
  }

  @Get(':id')
  @Auth([], [InvestorStatus.VERIFIED])
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    const auction = await this.auctionService.findOne(id, user);

    return {
      status: 'success',
      data: auction,
    };
  }

  @Patch(':id')
  @Auth([UserType.ADMIN, InvestorType.COMPANY], [InvestorStatus.VERIFIED])
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAuctionDto: UpdateAuctionDto,
    @GetUser() user: User,
  ) {
    const auction = await this.auctionService.update(
      id,
      updateAuctionDto,
      user,
    );

    return {
      status: 'success',
      data: auction,
    };
  }

  @Delete(':id')
  @Auth([UserType.ADMIN, InvestorType.COMPANY], [InvestorStatus.VERIFIED])
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    await this.auctionService.remove(id, user);

    return {
      status: 'success',
    };
  }
}
