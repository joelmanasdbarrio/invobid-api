import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsAuth } from '../user/auth/decorators/ws-auth.decorator';
import { User } from '../user/common/entities/user.entity';
import { UserType } from '../user/common/enums/user-type.enum';
import { BidService } from './bid.service';
import { CreateBidDto } from './dto/create-bid.dto';

@WebSocketGateway({
  namespace: '/auctions',
  cors: {
    origin: 'http://localhost:5173',
    credentials: true,
  },
})
export class BidWsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private readonly viewers = new Map<string, Map<string, number>>();
  private readonly clientRooms = new Map<string, string>();
  private readonly socketUserMap = new Map<string, string>();

  constructor(private readonly bidService: BidService) {}

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
  @SubscribeMessage('place-bid')
  async handlePlaceBid(
    client: Socket,
    payload: CreateBidDto,
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const user = (client.data as Record<string, unknown>).user as User;
      const bid = await this.bidService.create(payload, user);
      this.server.to(payload.auctionId).emit('new-bid', bid);
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
      this.clientRooms.delete(client.id);
      this.socketUserMap.delete(client.id);
    }
  }
}
