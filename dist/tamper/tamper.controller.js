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
exports.TamperController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const tamper_service_1 = require("./tamper.service");
const create_tamper_event_dto_1 = require("./dto/create-tamper-event.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let TamperController = class TamperController {
    constructor(tamperService) {
        this.tamperService = tamperService;
    }
    async log(dto) {
        const event = await this.tamperService.log(dto);
        return { success: true, event };
    }
};
exports.TamperController = TamperController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Log a tamper detection event and trigger cascades',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_tamper_event_dto_1.CreateTamperEventDto]),
    __metadata("design:returntype", Promise)
], TamperController.prototype, "log", null);
exports.TamperController = TamperController = __decorate([
    (0, common_1.Controller)('tamper-events'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiTags)('Tamper Events'),
    __metadata("design:paramtypes", [tamper_service_1.TamperService])
], TamperController);
//# sourceMappingURL=tamper.controller.js.map