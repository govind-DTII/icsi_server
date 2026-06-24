import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConsentService } from './consent.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';

@Controller('consent')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Consent')
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Get()
  @ApiOperation({ summary: 'List consent requests for current user' })
  getAll(@Request() req) {
    return this.consentService.findAll(req.user.userId, req.user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get consent request details' })
  getById(@Param('id') id: string, @Request() req) {
    return this.consentService.findById(id, req.user.userId);
  }

  // Legacy write routes removed — superseded by the spec-canonical endpoints:
  //   POST /consent          → POST /consent_request   (Spec Step 14, operator)
  //   POST /consent/:id/approve|reject → POST /consent_response (Step 16, owner)
  //   POST /consent/from-ble → POST /consent_request
  // submitConsentResponse() still reuses approve()/reject() internally.

  @Post(':id/hid-result')
  @Roles('operator')
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Spec §6.2 — operator reports HID inject outcome',
    description:
      'Called when the operator app receives the firmware hid_pin_inject_ack. ' +
      'On status=success the backend pings the owner that their PIN was used. ' +
      'Non-success is ignored (no owner notification).',
  })
  hidResult(
    @Param('id') id: string,
    @Body() body: { status: string; used_at?: number },
    @Request() req,
  ) {
    return this.consentService.notifyHidInjectUsed(
      id,
      body.status,
      body.used_at,
      req.user.userId,
    );
  }

  @Post(':id/abort')
  @Roles('owner', 'operator')
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Abort consent request (Owner or Operator)',
    description:
      'Owner: manual abort. Operator: REQUEST_EXPIRED after 60 s timer or ABORTED_BY_USER.',
  })
  async abort(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Request() req,
  ) {
    await this.consentService.assertPartyById(id, req.user.userId);
    return this.consentService.markAborted(id, body.reason ?? 'OWNER_ABORTED');
  }
}
