import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { Auth } from '../user/auth/decorators/auth.decorator';
import { GetUser } from '../user/auth/decorators/get-user.decorator';
import { User } from '../user/common/entities/user.entity';
import { BidService } from './bid.service';
import { GetBidsDto } from './dto/get-bids.dto';

@Controller('bid')
export class BidController {
  constructor(private readonly bidService: BidService) {}

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
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    const bid = await this.bidService.findOne(id, user);

    return {
      status: 'success',
      data: bid,
    };
  }
}
