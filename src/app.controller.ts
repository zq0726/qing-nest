import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { AppService } from '@/app.service';
import { Public } from '@/common/decorators/public.decorator';
import { MailService } from '@/modules/system/mail/mail.service';
import { SendCodeDto } from '@/modules/system/mail/dto/send-code.dto';
import { VerifyCodeDto } from '@/modules/system/mail/dto/verify-code.dto';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly mailService: MailService,
  ) {}

  @Public()
  @Get()
  @ApiOkResponse({ description: '返回问候语' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Post('email/send-code')
  @ApiOperation({ summary: '发送邮箱验证码' })
  sendCode(@Body() dto: SendCodeDto) {
    return this.mailService.sendVerificationCode(dto.email);
  }

  @Public()
  @Post('email/verify-code')
  @ApiOperation({ summary: '校验邮箱验证码' })
  async verifyCode(@Body() dto: VerifyCodeDto) {
    await this.mailService.verifyCode(dto.email, dto.code);
    return { valid: true, message: '验证成功' };
  }
}
