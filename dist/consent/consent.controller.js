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
exports.ConsentController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const consent_service_1 = require("./consent.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
let ConsentController = class ConsentController {
    constructor(consentService) {
        this.consentService = consentService;
    }
    getAll(req) {
        return this.consentService.findAll(req.user.userId, req.user.role);
    }
    getById(id, req) {
        return this.consentService.findById(id, req.user.userId);
    }
    hidResult(id, body, req) {
        return this.consentService.notifyHidInjectUsed(id, body?.status ?? 'unknown', body?.used_at, req.user.userId);
    }
    async abort(id, body, req) {
        await this.consentService.assertPartyById(id, req.user.userId);
        return this.consentService.markAborted(id, body?.reason ?? 'OWNER_ABORTED');
    }
};
exports.ConsentController = ConsentController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List consent requests for current user' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ConsentController.prototype, "getAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get consent request details' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ConsentController.prototype, "getById", null);
__decorate([
    (0, common_1.Post)(':id/hid-result'),
    (0, roles_guard_1.Roles)('operator'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, swagger_1.ApiOperation)({
        summary: 'Spec §6.2 — operator reports HID inject outcome',
        description: 'Called when the operator app receives the firmware hid_pin_inject_ack. ' +
            'On status=success the backend pings the owner that their PIN was used. ' +
            'Non-success is ignored (no owner notification).',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], ConsentController.prototype, "hidResult", null);
__decorate([
    (0, common_1.Post)(':id/abort'),
    (0, roles_guard_1.Roles)('owner', 'operator'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, swagger_1.ApiOperation)({
        summary: 'Abort consent request (Owner or Operator)',
        description: 'Owner: manual abort. Operator: REQUEST_EXPIRED after 60 s timer or ABORTED_BY_USER.',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ConsentController.prototype, "abort", null);
exports.ConsentController = ConsentController = __decorate([
    (0, common_1.Controller)('consent'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiTags)('Consent'),
    __metadata("design:paramtypes", [consent_service_1.ConsentService])
], ConsentController);
//# sourceMappingURL=consent.controller.js.map