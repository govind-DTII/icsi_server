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
exports.BleEventsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const ble_events_service_1 = require("./ble-events.service");
const ble_event_dto_1 = require("./dto/ble-event.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let BleEventsController = class BleEventsController {
    constructor(bleEventsService) {
        this.bleEventsService = bleEventsService;
    }
    async record(dto, req) {
        const event = await this.bleEventsService.recordEvent({
            ...dto,
            actorId: req.user?.userId,
        });
        return { success: true, event };
    }
    list(sessionId, limit) {
        return this.bleEventsService.listAudit(limit ? parseInt(limit, 10) : undefined, sessionId);
    }
};
exports.BleEventsController = BleEventsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Append a BLE audit event' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ble_event_dto_1.BleEventDto, Object]),
    __metadata("design:returntype", Promise)
], BleEventsController.prototype, "record", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'List the BLE protocol audit trail (most recent first)',
    }),
    (0, swagger_1.ApiQuery)({ name: 'sessionId', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, common_1.Query)('sessionId')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], BleEventsController.prototype, "list", null);
exports.BleEventsController = BleEventsController = __decorate([
    (0, common_1.Controller)('ble-events'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiTags)('BLE Events'),
    __metadata("design:paramtypes", [ble_events_service_1.BleEventsService])
], BleEventsController);
//# sourceMappingURL=ble-events.controller.js.map