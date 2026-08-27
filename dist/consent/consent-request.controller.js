"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsentRequestController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const multer_1 = require("multer");
const path_1 = require("path");
const consent_service_1 = require("./consent.service");
const create_consent_request_dto_1 = require("./dto/create-consent-request.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const uploads_path_1 = require("../uploads-path");
let ConsentRequestController = class ConsentRequestController {
    constructor(consentService) {
        this.consentService = consentService;
    }
    async create(body, file, req) {
        const expiresAt = typeof body.expires_at === 'string'
            ? parseInt(body.expires_at, 10)
            : body.expires_at;
        const toNum = (v) => {
            if (v === undefined || v === null || v === '')
                return null;
            const n = typeof v === 'number' ? v : parseFloat(String(v));
            return Number.isFinite(n) ? n : null;
        };
        return this.consentService.createConsentRequest(req.user.userId, {
            ...body,
            expires_at: expiresAt,
            latitude: toNum(body.latitude),
            longitude: toNum(body.longitude),
            location_accuracy: toNum(body.location_accuracy),
            location_captured_at: body.location_captured_at ?? null,
            street: body.street ?? null,
            city: body.city ?? null,
            state: body.state ?? null,
            postal_code: body.postal_code ?? null,
        }, file);
    }
};
exports.ConsentRequestController = ConsentRequestController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_guard_1.Roles)('operator'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('document', {
        storage: (0, multer_1.diskStorage)({
            destination: uploads_path_1.UPLOADS_DIR,
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                cb(null, uniqueSuffix + (0, path_1.extname)(file.originalname));
            },
        }),
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
            const ext = (0, path_1.extname)(file.originalname).toLowerCase();
            if (allowed.includes(ext)) {
                cb(null, true);
            }
            else {
                cb(null, false);
            }
        },
    })),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({ summary: 'Spec Step 14 — operator submits consent_request' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_consent_request_dto_1.CreateConsentRequestDto, Object, Object]),
    __metadata("design:returntype", Promise)
], ConsentRequestController.prototype, "create", null);
exports.ConsentRequestController = ConsentRequestController = __decorate([
    (0, common_1.Controller)('consent_request'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiTags)('Consent Request'),
    __metadata("design:paramtypes", [consent_service_1.ConsentService])
], ConsentRequestController);
//# sourceMappingURL=consent-request.controller.js.map