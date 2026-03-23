import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Auth } from '../user/auth/decorators/auth.decorator';
import { GetUser } from '../user/auth/decorators/get-user.decorator';
import { User } from '../user/common/entities/user.entity';
import { UserType } from '../user/common/enums/user-type.enum';
import { BidService } from './bid.service';
import { CreateBidDto } from './dto/create-bid.dto';
import { GetBidsDto } from './dto/get-bids.dto';

@Controller('bid')
export class BidController {
  constructor(private readonly bidService: BidService) {}

  @Post()
  @Auth([UserType.INVESTOR])
  create(@Body() createBidDto: CreateBidDto, @GetUser() user: User) {
    return this.bidService.create(createBidDto, user);
  }

  @Get()
  @Auth()
  async findAll(@Query() query: GetBidsDto, @GetUser() user: User) {
    const { data, total, page, limit } = await this.bidService.findAll(
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
  @Auth()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.bidService.findOne(id);
  }
}
