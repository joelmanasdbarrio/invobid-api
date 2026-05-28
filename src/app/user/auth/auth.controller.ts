import {
  Body,
  Controller,
  Headers,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { type Response } from 'express';
import { FileTypePipe } from 'src/pipes/file-type.pipe';
import { CreateAdminDto } from '../admin/dto/create-admin.dto';
import { CreateInvestorDto } from '../investor/dto/create-investor.dto';
import { AuthService } from './auth.service';
import { LoginUserDto } from './dto/login-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() login: LoginUserDto,
    @Headers('x-activate-account') activateAccount: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, access_token } = await this.authService.login(
      login,
      activateAccount === 'true',
    );

    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: login.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000, // 30 days or 1 day
      sameSite: 'lax',
    });
    res.status(200);

    return {
      status: 'success',
      data: user,
      access_token,
    };
  }

  @Post('register/admin')
  async registerAdmin(
    @Body() registerAdminDto: CreateAdminDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { admin, access_token } =
      await this.authService.registerAdmin(registerAdminDto);

    delete admin.password;

    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      sameSite: 'lax',
    });

    return {
      status: 'success',
      data: admin,
      access_token,
    };
  }

  @Post('register/investor')
  @UseInterceptors(FileInterceptor('document'))
  async registerInvestor(
    @Body() registerInvestorDto: CreateInvestorDto,
    @UploadedFile(FileTypePipe)
    file: Express.Multer.File,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { investor, access_token } = await this.authService.registerInvestor(
      registerInvestorDto,
      file,
    );

    delete investor.password;

    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      sameSite: 'lax',
    });

    return {
      status: 'success',
      data: investor,
      access_token,
    };
  }
}
