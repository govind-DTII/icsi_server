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
exports.ConsentResponseController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const consent_service_1 = require("./consent.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
let ConsentResponseController = class ConsentResponseController {
    constructor(consentService) {
        this.consentService = consentService;
    }
    submit(body, req) {
        return this.consentService.submitConsentResponse(req.user.userId, body);
    }
    getResponse(consentId, req) {
        return this.consentService.getConsentResponse(consentId, req.user.userId);
    }
};
exports.ConsentResponseController = ConsentResponseController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_guard_1.Roles)('owner'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, swagger_1.ApiOperation)({
        summary: 'Spec Step 16 — owner records approve/reject decision',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ConsentResponseController.prototype, "submit", null);
__decorate([
    (0, common_1.Get)(':consentId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Fetch the owner decision (jwt_token + payload) for a consent',
    }),
    __param(0, (0, common_1.Param)('consentId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ConsentResponseController.prototype, "getResponse", null);
exports.ConsentResponseController = ConsentResponseController = __decorate([
    (0, common_1.Controller)('consent_response'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiTags)('Consent Response'),
    __metadata("design:paramtypes", [consent_service_1.ConsentService])
], ConsentResponseController);
//# sourceMappingURL=consent-response.controller.js.map