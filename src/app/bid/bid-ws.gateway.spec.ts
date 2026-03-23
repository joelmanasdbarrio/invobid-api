import { Test, TestingModule } from '@nestjs/testing';
import { BidWsGateway } from './bid-ws.gateway';

describe('BidWsGateway', () => {
  let gateway: BidWsGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BidWsGateway],
    }).compile();

    gateway = module.get<BidWsGateway>(BidWsGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
