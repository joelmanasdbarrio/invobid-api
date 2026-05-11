import { Test, TestingModule } from '@nestjs/testing';
import { AuctionService } from '../auction/auction.service';
import { WsJwtGuard } from '../user/auth/guards/ws-jwt.guard';
import { WsUserRoleGuard } from '../user/auth/guards/ws-user-role.guard';
import { BidWsGateway } from './bid-ws.gateway';
import { BidService } from './bid.service';

describe('BidWsGateway', () => {
  let gateway: BidWsGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BidWsGateway,
        { provide: BidService, useValue: {} },
        { provide: AuctionService, useValue: {} },
      ],
    })
      .overrideGuard(WsJwtGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(WsUserRoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    gateway = module.get<BidWsGateway>(BidWsGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
