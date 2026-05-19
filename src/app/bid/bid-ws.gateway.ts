import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuctionService } from '../auction/auction.service';
import { WsAuth } from '../user/auth/decorators/ws-auth.decorator';
import { User } from '../user/common/entities/user.entity';
import { UserType } from '../user/common/enums/user-type.enum';
import { Investor } from '../user/investor/entities/investor.entity';
import { BidService } from './bid.service';
import { CreateBidDto } from './dto/create-bid.dto';

@WebSocketGateway({
  namespace: '/auctions',
  cors: {
    origin: process.env.CORS_ORIGIN || [
      'http://localhost:5173',
      'http://192.168.0.10:5173',
    ],
    credentials: true,
  },
})
export class BidWsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private readonly viewers = new Map<string, Map<string, number>>();
  private readonly clientRooms = new Map<string, string>();
  private readonly socketUserMap = new Map<string, string>();

  constructor(
    private readonly bidService: BidService,
    private readonly auctionService: AuctionService,
  ) {}

  @WsAuth([UserType.INVESTOR])
  @SubscribeMessage('join-auction')
  async handleJoinAuction(
    client: Socket,
    payload: { auctionId: string },
  ): Promise<void> {
    const { auctionId } = payload;
    const user = (client.data as Record<string, unknown>).user as User;
    const userId = user.id;

    await client.join(auctionId);

    if (!this.viewers.has(auctionId)) {
      this.viewers.set(auctionId, new Map());
    }
    const userCount = this.viewers.get(auctionId)!;
    const currentCount = userCount.get(userId) ?? 0;
    userCount.set(userId, currentCount + 1);

    this.clientRooms.set(client.id, auctionId);
    this.socketUserMap.set(client.id, userId);

    this.server.to(auctionId).emit('viewer-count', userCount.size);
  }

  @WsAuth([UserType.INVESTOR])
  @SubscribeMessage('join-balance')
  handleJoinBalance(client: Socket): void {
    const user = (client.data as Record<string, unknown>).user as User;
    this.socketUserMap.set(client.id, user.id);
  }

  @WsAuth([UserType.INVESTOR])
  @SubscribeMessage('place-bid')
  async handlePlaceBid(
    client: Socket,
    payload: CreateBidDto,
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const user = (client.data as Record<string, unknown>).user as Investor;
      const { bid, balanceUpdates } = await this.bidService.create(
        payload,
        user,
      );
      const newEndDate = await this.auctionService.extendAuctionIfNeeded(
        payload.auctionId,
      );
      this.server.to(payload.auctionId).emit('new-bid', bid.id);
      this.server.emit('auction-bid-update', {
        auctionId: payload.auctionId,
        newEndDate,
      });

      for (const update of balanceUpdates) {
        for (const [socketId, userId] of this.socketUserMap.entries()) {
          if (userId === update.investorId) {
            this.server.to(socketId).emit('balance-update', {
              reservedBalance: update.reservedBalance,
            });
          }
        }
      }

      return { success: true };
    } catch (error) {
      return { success: false, message: (error as Error).message };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleConnection(client: Socket): void {
    // console.log('Client connected:', client.id);
  }

  handleDisconnect(client: Socket): void {
    // console.log('Client disconnected:', client.id);

    const auctionId = this.clientRooms.get(client.id);
    const userId = this.socketUserMap.get(client.id);

    if (auctionId && userId) {
      const userCount = this.viewers.get(auctionId);
      if (userCount) {
        const count = (userCount.get(userId) ?? 0) - 1;
        if (count <= 0) {
          userCount.delete(userId);
        } else {
          userCount.set(userId, count);
        }
        this.server.to(auctionId).emit('viewer-count', userCount.size);
      }
    }
    this.clientRooms.delete(client.id);
    this.socketUserMap.delete(client.id);
  }
}
