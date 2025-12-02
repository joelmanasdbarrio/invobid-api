import {
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
import { CreateInvestorDto } from '../investor/dto/create-investor.dto';
import { Investor } from '../investor/entities/investor.entity';
import { InvestorService } from '../investor/investor.service';
import { CreateSupplierDto } from '../supplier/dto/create-supplier.dto';
import { Supplier } from '../supplier/entities/supplier.entity';
import { SupplierService } from '../supplier/supplier.service';
import { LoginUserDto } from './dto/login-user.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly adminService: AdminService,
    private readonly supplierService: SupplierService,
    private readonly investorService: InvestorService,
    private readonly jwtService: JwtService,
  ) {}

  async login(login: LoginUserDto): Promise<{ access_token: string }> {
    const user = await this.userRepository.findOne({
      where: { email: login.email },
      select: { email: true, password: true, id: true },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(login.password, user.password);

    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials');

    return { access_token: this.jwtService.sign({ email: user.email }) };
  }

  async registerAdmin(
    registerAdminDto: CreateAdminDto,
  ): Promise<{ admin: Admin; access_token: string }> {
    const admin = await this.adminService.create(registerAdminDto);

    if (!admin) {
      throw new InternalServerErrorException('Failed to create user account');
    }

    return {
      admin,
      access_token: this.jwtService.sign({ email: admin.email }),
    };
  }

  async registerSupplier(
    registerSupplierDto: CreateSupplierDto,
    files: { document: Express.Multer.File[]; logo: Express.Multer.File[] },
  ): Promise<{ supplier: Supplier; access_token: string }> {
    const supplier = await this.supplierService.create(
      registerSupplierDto,
      files,
    );

    return {
      supplier,
      access_token: this.jwtService.sign({ email: supplier.email }),
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

    return {
      investor,
      access_token: this.jwtService.sign({ email: investor.email }),
    };
  }
}
