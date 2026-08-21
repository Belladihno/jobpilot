import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/configuration';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { RegisterSchema } from './schemas/register.schema';
import type { RegisterDto } from './schemas/register.schema';
import { LoginSchema } from './schemas/login.schema';
import type { LoginDto } from './schemas/login.schema';
import type { SessionEntity } from './entities/session.entity';
import type { UserEntity } from '../users/entities/user.entity';
import {
  CurrentSession,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  @Public()
  @Post('register')
  async register(
    @Body(new ZodValidationPipe(RegisterSchema)) dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token } = await this.authService.register(dto, {
      ip: req.ip ?? '',
      userAgent: req.headers['user-agent'] ?? '',
    });

    this.setCookie(res, token);

    return this.sanitizeUser(user);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(LoginSchema)) dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token } = await this.authService.login(dto, {
      ip: req.ip ?? '',
      userAgent: req.headers['user-agent'] ?? '',
    });

    this.setCookie(res, token);

    return this.sanitizeUser(user);
  }

  @Get('me')
  me(@CurrentUser() user: UserEntity) {
    return this.sanitizeUser(user);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentSession() session: SessionEntity,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(session.id);
    this.clearCookie(res);
    return { message: 'Logged out' };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @CurrentUser() user: UserEntity,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logoutAll(user.id);
    this.clearCookie(res);
    return { message: 'All sessions revoked' };
  }

  private setCookie(res: Response, token: string) {
    const cookieConfig = this.config.get('auth.cookie', { infer: true });
    res.cookie(cookieConfig.name, token, {
      httpOnly: cookieConfig.httpOnly,
      secure: cookieConfig.secure,
      sameSite: cookieConfig.sameSite,
      maxAge: this.config.get('auth.sessionTtlSeconds', { infer: true }) * 1000,
    });
  }

  private clearCookie(res: Response) {
    const cookieName = this.config.get('auth.cookie.name', { infer: true });
    res.clearCookie(cookieName);
  }

  private sanitizeUser(user: UserEntity) {
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  }
}
