import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { BleEventsService } from './ble-events.service';
import { BleEventDto } from './dto/ble-event.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthedRequest {
  user?: { userId?: string };
}

@Controller('ble-events')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('BLE Events')
export class BleEventsController {
  constructor(private readonly bleEventsService: BleEventsService) {}

  @Post()
  @ApiOperation({ summary: 'Append a BLE audit event' })
  async record(@Body() dto: BleEventDto, @Req() req: AuthedRequest) {
    // actorId is server-authoritative — taken from the authenticated JWT, never
    // from the request body — so every app-reported BLE event is attributable.
    const event = await this.bleEventsService.recordEvent({
      ...dto,
      actorId: req.user?.userId,
    });
    return { success: true, event };
  }

  @Get()
  @ApiOperation({
    summary: 'List the BLE protocol audit trail (most recent first)',
  })
  @ApiQuery({ name: 'sessionId', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  list(@Query('sessionId') sessionId?: string, @Query('limit') limit?: string) {
    return this.bleEventsService.listAudit(
      limit ? parseInt(limit, 10) : undefined,
      sessionId,
    );
  }
}
