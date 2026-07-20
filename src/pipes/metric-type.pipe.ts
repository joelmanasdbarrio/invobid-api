import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { MetricType } from 'src/app/metric/metric.service';

@Injectable()
export class MetricTypePipe implements PipeTransform {
  transform(value: MetricType) {
    if (!Array.from(Object.values(MetricType)).includes(value)) {
      throw new BadRequestException(`Metric ${value} is not a valid type`);
    }

    return value;
  }
}
