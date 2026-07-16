import { Controller, Get, Param } from '@nestjs/common';
import { MetricService, MetricType } from './metric.service';
import { MetricTypePipe } from 'src/pipes/metric-type.pipe';
import { GetUser } from 'src/app/user/auth/decorators/get-user.decorator';
import { User } from 'src/app/user/common/entities/user.entity';
import { Auth } from 'src/app/user/auth/decorators/auth.decorator';

@Controller('metrics')
export class MetricController {
  constructor(private readonly metricService: MetricService) {}

  @Get(':id')
  @Auth()
  async findOne(
    @Param('id', MetricTypePipe) id: MetricType,
    @GetUser() user: User,
  ) {
    const metric = await this.metricService.get(id, user);

    return {
      status: 'success',
      data: metric,
    };
  }
}
