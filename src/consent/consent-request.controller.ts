import {
  Body,
  Controller,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ConsentService } from './consent.service';
import { CreateConsentRequestDto } from './dto/create-consent-request.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';

// Spec Step 14 — operator submits a consent request, including the
// attached document, via multipart/form-data. The path, field naming,
// and response shape mirror the BLE cmd vocabulary.
@Controller('consent_request')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Consent Request')
export class ConsentRequestController {
  constructor(private readonly consentService: ConsentService) {}

  @Post()
  @Roles('operator')
  @UseGuards(RolesGuard)
  @UseInterceptors(
    FileInterceptor('document', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
        const ext = extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
          cb(null, true);
        } else {
          cb(new Error('File type not allowed'), false);
        }
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Spec Step 14 — operator submits consent_request' })
  async create(
    @Body() body: CreateConsentRequestDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    const expiresAt =
      typeof body.expires_at === 'string'
        ? parseInt(body.expires_at, 10)
        : body.expires_at;

    return this.consentService.createConsentRequest(
      req.user.userId,
      { ...body, expires_at: expiresAt },
      file,
    );
  }
}
