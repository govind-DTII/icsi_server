import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RtcSyncService } from './rtc-sync.service';
import { RtcCorrectionDto } from './dto/log-rtc-correction.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('rtc-corrections')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('RTC Sync')
export class RtcSyncController {
  constructor(private readonly rtcSyncService: RtcSyncService) {}

  @Post()
  @ApiOperation({
    summary: 'Log an RTC clock correction from the Operator app',
  })
  async logCorrection(@Body() dto: RtcCorrectionDto) {
    const event = await this.rtcSyncService.logCorrection(dto);
    return { success: true, event };
  }
}
