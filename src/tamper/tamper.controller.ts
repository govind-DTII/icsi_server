import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TamperService } from './tamper.service';
import { CreateTamperEventDto } from './dto/create-tamper-event.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('tamper-events')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Tamper Events')
export class TamperController {
  constructor(private readonly tamperService: TamperService) {}

  @Post()
  @ApiOperation({
    summary: 'Log a tamper detection event and trigger cascades',
  })
  async log(@Body() dto: CreateTamperEventDto) {
    const event = await this.tamperService.log(dto);
    return { success: true, event };
  }
}
