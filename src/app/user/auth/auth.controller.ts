import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { FilesTypePipe, FileTypePipe } from 'src/pipes/file-type.pipe';
import { CreateAdminDto } from '../admin/dto/create-admin.dto';
import { CreateInvestorDto } from '../investor/dto/create-investor.dto';
import { CreateSupplierDto } from '../supplier/dto/create-supplier.dto';
import { AuthService } from './auth.service';
import { LoginUserDto } from './dto/login-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() login: LoginUserDto) {
    const { access_token } = await this.authService.login(login);
    return {
      status: 'success',
      access_token,
    };
  }

  @Post('register/admin')
  async registerAdmin(@Body() registerAdminDto: CreateAdminDto) {
    const { admin, access_token } =
      await this.authService.registerAdmin(registerAdminDto);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUser } = admin;

    return {
      status: 'success',
      data: safeUser,
      access_token,
    };
  }

  @Post('register/supplier')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'document', maxCount: 1 },
      { name: 'logo', maxCount: 1 },
    ]),
  )
  async registerSupplier(
    @Body() registerSupplierDto: CreateSupplierDto,
    @UploadedFiles(FilesTypePipe)
    files: { document: Express.Multer.File[]; logo: Express.Multer.File[] },
  ) {
    const { supplier, access_token } = await this.authService.registerSupplier(
      registerSupplierDto,
      files,
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUser } = supplier;

    return {
      status: 'success',
      data: safeUser,
      access_token,
    };
  }

  @Post('register/investor')
  @UseInterceptors(FileInterceptor('document'))
  async registerInvestor(
    @Body() registerInvestorDto: CreateInvestorDto,
    @UploadedFile(FileTypePipe) file: Express.Multer.File,
  ) {
    const { investor, access_token } = await this.authService.registerInvestor(
      registerInvestorDto,
      file,
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUser } = investor;

    return {
      status: 'success',
      data: safeUser,
      access_token,
    };
  }
}
