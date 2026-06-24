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

// Spec Step 16. Two endpoints share the /consent_response prefix:
//   POST /consent_response                 → owner records decision
//   GET  /consent_response/:consent_id     → operator app fetches it
// The GET response carries the JWT and PIN over TLS, not via FCM.
@Controller('consent_response')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Consent Response')
export class ConsentResponseController {
  constructor(private readonly consentService: ConsentService) {}

  @Post()
  @Roles('owner')
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Spec Step 16 — owner records approve/reject decision',
  })
  submit(
    @Body() body: { consent_id: string; decision: string; reason?: string },
    @Request() req,
  ) {
    return this.consentService.submitConsentResponse(req.user.userId, body);
  }

  @Get(':consentId')
  @ApiOperation({
    summary: 'Fetch the owner decision (jwt_token + payload) for a consent',
  })
  getResponse(@Param('consentId') consentId: string, @Request() req) {
    return this.consentService.getConsentResponse(consentId, req.user.userId);
  }
}
