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
exports.SessionsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const sessions_service_1 = require("./sessions.service");
const session_dto_1 = require("./dto/session.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let SessionsController = class SessionsController {
    constructor(sessionsService) {
        this.sessionsService = sessionsService;
    }
    async start(dto) {
        const session = await this.sessionsService.start(dto);
        return { success: true, session };
    }
    async getBySessionId(sessionId) {
        const session = await this.sessionsService.findBySessionId(sessionId);
        return { success: true, session };
    }
    async updateState(sessionId, dto) {
        const session = await this.sessionsService.updateState(sessionId, dto);
        return { success: true, session };
    }
    async end(sessionId, dto) {
        const session = await this.sessionsService.end(sessionId, dto);
        return { success: true, session };
    }
};
exports.SessionsController = SessionsController;
__decorate([
    (0, common_1.Post)('start'),
    (0, swagger_1.ApiOperation)({
        summary: 'Start a new BLE session (ends any open session for the same device first)',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [session_dto_1.CreateSessionDto]),
    __metadata("design:returntype", Promise)
], SessionsController.prototype, "start", null);
__decorate([
    (0, common_1.Get)(':sessionId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a session by session_id' }),
    __param(0, (0, common_1.Param)('sessionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SessionsController.prototype, "getBySessionId", null);
__decorate([
    (0, common_1.Patch)(':sessionId/state'),
    (0, swagger_1.ApiOperation)({ summary: 'Advance session state machine' }),
    __param(0, (0, common_1.Param)('sessionId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, session_dto_1.UpdateSessionStateDto]),
    __metadata("design:returntype", Promise)
], SessionsController.prototype, "updateState", null);
__decorate([
    (0, common_1.Post)(':sessionId/end'),
    (0, swagger_1.ApiOperation)({ summary: 'End a session (idempotent)' }),
    __param(0, (0, common_1.Param)('sessionId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, session_dto_1.EndSessionDto]),
    __metadata("design:returntype", Promise)
], SessionsController.prototype, "end", null);
exports.SessionsController = SessionsController = __decorate([
    (0, common_1.Controller)('sessions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiTags)('Sessions'),
    __metadata("design:paramtypes", [sessions_service_1.SessionsService])
], SessionsController);
//# sourceMappingURL=sessions.controller.js.map