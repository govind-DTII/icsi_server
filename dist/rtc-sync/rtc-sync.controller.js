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
exports.RtcSyncController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const rtc_sync_service_1 = require("./rtc-sync.service");
const log_rtc_correction_dto_1 = require("./dto/log-rtc-correction.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let RtcSyncController = class RtcSyncController {
    constructor(rtcSyncService) {
        this.rtcSyncService = rtcSyncService;
    }
    async logCorrection(dto) {
        const event = await this.rtcSyncService.logCorrection(dto);
        return { success: true, event };
    }
};
exports.RtcSyncController = RtcSyncController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Log an RTC clock correction from the Operator app',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [log_rtc_correction_dto_1.RtcCorrectionDto]),
    __metadata("design:returntype", Promise)
], RtcSyncController.prototype, "logCorrection", null);
exports.RtcSyncController = RtcSyncController = __decorate([
    (0, common_1.Controller)('rtc-corrections'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiTags)('RTC Sync'),
    __metadata("design:paramtypes", [rtc_sync_service_1.RtcSyncService])
], RtcSyncController);
//# sourceMappingURL=rtc-sync.controller.js.map