import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { User } from '../../common/entities/user.entity';
import { UserType } from '../../common/enums/user-type.enum';
import { InvestorService } from '../../investor/investor.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly investorService: InvestorService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const client: Socket = ctx.switchToWs().getClient<Socket>();

    // Try to extract token from multiple sources:
    // 1. Socket.IO auth object (official)
    // 2. Query parameters (for Postman compatibility)
    // 3. Authorization header
    // 4. httpOnly cookie (browser connections)
    const cookieHeader = client.handshake?.headers?.cookie;
    const cookieToken = cookieHeader
      ?.split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('access_token='))
      ?.slice('access_token='.length);

    const token =
      (client.handshake?.auth?.token as string | undefined) ||
      (client.handshake?.query?.token as string | undefined) ||
      client.handshake?.headers?.authorization?.replace('Bearer ', '') ||
      cookieToken;

    if (!token) throw new WsException('Unauthorized');

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new WsException('Unauthorized');
    }

    let user = await this.userRepository.findOne({
      where: { email: payload.email },
      select: {
        id: true,
        email: true,
        password: false,
        name: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        type: true,
      },
      withDeleted: true,
    });

    if (!user) throw new WsException('Unauthorized');
    if (user.deletedAt) throw new WsException('User has been disabled');

    if (user.type === UserType.INVESTOR) {
      user = await this.investorService.findOne(user.id);
    }

    (client.data as Record<string, unknown>).user = user;
    return true;
  }
}
