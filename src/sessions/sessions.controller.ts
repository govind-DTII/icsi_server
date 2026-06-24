import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import {
  CreateSessionDto,
  EndSessionDto,
  UpdateSessionStateDto,
} from './dto/session.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post('start')
  @ApiOperation({
    summary:
      'Start a new BLE session (ends any open session for the same device first)',
  })
  async start(@Body() dto: CreateSessionDto) {
    const session = await this.sessionsService.start(dto);
    return { success: true, session };
  }

  @Get(':sessionId')
  @ApiOperation({ summary: 'Get a session by session_id' })
  async getBySessionId(@Param('sessionId') sessionId: string) {
    const session = await this.sessionsService.findBySessionId(sessionId);
    return { success: true, session };
  }

  @Patch(':sessionId/state')
  @ApiOperation({ summary: 'Advance session state machine' })
  async updateState(
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateSessionStateDto,
  ) {
    const session = await this.sessionsService.updateState(sessionId, dto);
    return { success: true, session };
  }

  @Post(':sessionId/end')
  @ApiOperation({ summary: 'End a session (idempotent)' })
  async end(@Param('sessionId') sessionId: string, @Body() dto: EndSessionDto) {
    const session = await this.sessionsService.end(sessionId, dto);
    return { success: true, session };
  }
}
