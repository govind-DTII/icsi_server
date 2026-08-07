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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EndSessionDto = exports.UpdateSessionStateDto = exports.CreateSessionDto = exports.EndReason = exports.SessionState = void 0;
const class_validator_1 = require("class-validator");
var SessionState;
(function (SessionState) {
    SessionState["IDLE"] = "IDLE";
    SessionState["CONSENT_REQUESTED"] = "CONSENT_REQUESTED";
    SessionState["CONSENT_ACTIVE"] = "CONSENT_ACTIVE";
    SessionState["CONSENT_COMPLETED"] = "CONSENT_COMPLETED";
    SessionState["SESSION_ENDING"] = "SESSION_ENDING";
})(SessionState || (exports.SessionState = SessionState = {}));
var EndReason;
(function (EndReason) {
    EndReason["COMPLETED"] = "COMPLETED";
    EndReason["TAMPER"] = "TAMPER";
    EndReason["TIMEOUT"] = "TIMEOUT";
    EndReason["ERROR"] = "ERROR";
    EndReason["DISCONNECTED"] = "DISCONNECTED";
    EndReason["ABORTED_BY_USER"] = "ABORTED_BY_USER";
    EndReason["OPERATOR_DECLINED"] = "OPERATOR_DECLINED";
})(EndReason || (exports.EndReason = EndReason = {}));
class CreateSessionDto {
}
exports.CreateSessionDto = CreateSessionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateSessionDto.prototype, "sessionId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateSessionDto.prototype, "deviceId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateSessionDto.prototype, "operatorId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateSessionDto.prototype, "ownerId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSessionDto.prototype, "txn", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSessionDto.prototype, "fwVersion", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSessionDto.prototype, "hwVersion", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSessionDto.prototype, "macAddress", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSessionDto.prototype, "bleVersion", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSessionDto.prototype, "tlsVersion", void 0);
class UpdateSessionStateDto {
}
exports.UpdateSessionStateDto = UpdateSessionStateDto;
__decorate([
    (0, class_validator_1.IsEnum)(SessionState),
    __metadata("design:type", String)
], UpdateSessionStateDto.prototype, "state", void 0);
class EndSessionDto {
}
exports.EndSessionDto = EndSessionDto;
__decorate([
    (0, class_validator_1.IsEnum)(EndReason),
    __metadata("design:type", String)
], EndSessionDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EndSessionDto.prototype, "notes", void 0);
//# sourceMappingURL=session.dto.js.map