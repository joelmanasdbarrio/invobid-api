import { Test, TestingModule } from '@nestjs/testing';
import { Socket } from 'socket.io';
import { AuctionService } from '../auction/auction.service';
import { WsJwtGuard } from '../user/auth/guards/ws-jwt.guard';
import { WsUserRoleGuard } from '../user/auth/guards/ws-user-role.guard';
import { BidWsGateway } from './bid-ws.gateway';
import { BidService } from './bid.service';

function makeSocket(id: string, userId?: string): Socket {
  return {
    id,
    data: userId ? { user: { id: userId } } : {},
  } as unknown as Socket;
}

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

  describe('handleJoinBalance', () => {
    it('should register the socket in socketUserMap', () => {
      const client = makeSocket('socket-1', 'user-abc');
      gateway.handleJoinBalance(client);
      expect((gateway as any).socketUserMap.get('socket-1')).toBe('user-abc');
    });

    it('should overwrite an existing entry for the same socket', () => {
      const client = makeSocket('socket-1', 'user-abc');
      gateway.handleJoinBalance(client);
      const client2 = makeSocket('socket-1', 'user-xyz');
      gateway.handleJoinBalance(client2);
      expect((gateway as any).socketUserMap.get('socket-1')).toBe('user-xyz');
    });
  });

  describe('handleDisconnect', () => {
    it('should clean up socketUserMap for a balance-only socket (not in clientRooms)', () => {
      const client = makeSocket('socket-bal', 'user-bal');
      gateway.handleJoinBalance(client);
      expect((gateway as any).socketUserMap.has('socket-bal')).toBe(true);

      gateway.handleDisconnect(client);
      expect((gateway as any).socketUserMap.has('socket-bal')).toBe(false);
    });

    it('should clean up both maps for an auction socket', () => {
      const client = makeSocket('socket-auc', 'user-auc');
      (gateway as any).socketUserMap.set('socket-auc', 'user-auc');
      (gateway as any).clientRooms.set('socket-auc', 'some-auction-id');
      const viewers = new Map<string, number>([['user-auc', 1]]);
      (gateway as any).viewers.set('some-auction-id', viewers);
      // Provide a no-op server stub
      (gateway as any).server = { to: () => ({ emit: () => {} }) };

      gateway.handleDisconnect(client);
      expect((gateway as any).socketUserMap.has('socket-auc')).toBe(false);
      expect((gateway as any).clientRooms.has('socket-auc')).toBe(false);
    });
  });
});
