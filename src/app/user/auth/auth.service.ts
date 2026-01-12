import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DeepPartial, Repository } from 'typeorm';
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
        id: true,
        email: true,
        name: true,
        password: true,
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
        type: user.type,
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
  ): Promise<{ admin: DeepPartial<Admin>; access_token: string }> {
    const admin = await this.adminService.create(registerAdminDto);

    if (!admin) {
      throw new InternalServerErrorException('Failed to create user account');
    }

    const access_token = this.jwtService.sign(
      {
        id: admin.id,
        email: admin.email,
        type: UserType.ADMIN,
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
  ): Promise<{ investor: DeepPartial<Investor>; access_token: string }> {
    const investor = await this.investorService.create(
      registerInvestorDto,
      file,
    );

    const access_token = this.jwtService.sign(
      {
        id: investor.id,
        email: investor.email,
        type: UserType.INVESTOR,
      },
      { expiresIn: '1d' },
    );

    return {
      investor: {
        id: investor.id,
        email: investor.email,
        name: investor.name,
        companyName: investor.companyName,
        phoneNumber: investor.phoneNumber,
        type: UserType.INVESTOR,
        investorType: investor.investorType,
        status: investor.status,
        lastCommunication: investor.lastCommunication,
      },
      access_token,
    };
  }
}
