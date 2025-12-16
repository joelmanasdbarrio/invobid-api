import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { User } from '../../common/entities/user.entity';
import { UserType } from '../../common/enums/user-type.enum';
import { Investor } from 'src/app/user/investor/entities/investor.entity';
import { InvestorService } from '../../investor/investor.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly investorService: InvestorService,
  ) {
    super({
      secretOrKey: configService.get<string>('JWT_SECRET')!,
      jwtFromRequest: (req: Request) => {
        if (req.headers.authorization?.startsWith('Bearer ')) {
          return req.headers.authorization.split(' ')[1];
        }

        if (req.cookies?.access_token) {
          return req.cookies.access_token as string;
        }
        return null;
      },
    });
  }

  async validate(payload: JwtPayload): Promise<User | Investor> {
    const { email } = payload;
    let user = await this.userRepository.findOne({
      where: { email },
      select: {
        id: true,
        email: true,
        password: false,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        type: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Token is not valid');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User has been disabled');
    }

    if (user.type === UserType.INVESTOR) {
      user = await this.investorService.findOne(user.id);
    }

    return user;
  }
}
