import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AdminService } from '../admin/admin.service';
import { CreateAdminDto } from '../admin/dto/create-admin.dto';
import { Admin } from '../admin/entities/admin.entity';
import { User } from '../common/entities/user.entity';
import { UserType } from '../common/enums/user-type.enum';
import { CreateInvestorDto } from '../investor/dto/create-investor.dto';
import { Investor } from '../investor/entities/investor.entity';
import { InvestorService } from '../investor/investor.service';
import { LoginUserDto } from './dto/login-user.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly adminService: AdminService,
    private readonly investorService: InvestorService,
    private readonly jwtService: JwtService,
  ) {}

  async login(
    login: LoginUserDto,
    activateAccount: boolean = false,
  ): Promise<{ user: User; access_token: string }> {
    let user = await this.userRepository.findOne({
      where: { email: login.email },
      select: {
        email: true,
        password: true,
        id: true,
        name: true,
        type: true,
        deletedAt: true,
      },
      withDeleted: true,
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(login.password, user.password);

    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials');

    if (user.deletedAt) {
      if (activateAccount) {
        user.deletedAt = null;
        await this.userRepository.save(user);
      } else {
        throw new HttpException('User account is locked', 423);
      }
    }

    if (user.type === UserType.INVESTOR) {
      user = await this.investorService.findOne(user.id);
    }

    const access_token = this.jwtService.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        type: user.type,
        investorType:
          user.type === UserType.INVESTOR && (user as Investor).investorType,
      },
      {
        expiresIn: login.rememberMe ? '30d' : '1d',
      },
    );

    return {
      user,
      access_token,
    };
  }

  async registerAdmin(
    registerAdminDto: CreateAdminDto,
  ): Promise<{ admin: Admin; access_token: string }> {
    const admin = await this.adminService.create(registerAdminDto);

    if (!admin) {
      throw new InternalServerErrorException('Failed to create user account');
    }

    const access_token = this.jwtService.sign(
      {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        type: 'admin',
      },
      { expiresIn: '1d' },
    );

    return {
      admin,
      access_token,
    };
  }

  async registerInvestor(
    registerInvestorDto: CreateInvestorDto,
    file: Express.Multer.File,
  ): Promise<{ investor: Investor; access_token: string }> {
    const investor = await this.investorService.create(
      registerInvestorDto,
      file,
    );

    const access_token = this.jwtService.sign(
      {
        id: investor.id,
        email: investor.email,
        name: investor.name,
        type: 'investor',
      },
      { expiresIn: '1d' },
    );

    return {
      investor,
      access_token,
    };
  }
}
