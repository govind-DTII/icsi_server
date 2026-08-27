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
exports.TamperEvent = void 0;
const typeorm_1 = require("typeorm");
let TamperEvent = class TamperEvent {
};
exports.TamperEvent = TamperEvent;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TamperEvent.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'device_id', length: 32 }),
    __metadata("design:type", String)
], TamperEvent.prototype, "deviceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'session_id', length: 64, nullable: true }),
    __metadata("design:type", String)
], TamperEvent.prototype, "sessionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'consent_id', length: 64, nullable: true }),
    __metadata("design:type", String)
], TamperEvent.prototype, "consentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'detected_at', type: 'timestamptz', default: () => 'NOW()' }),
    __metadata("design:type", Date)
], TamperEvent.prototype, "detectedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reported_by', length: 32 }),
    __metadata("design:type", String)
], TamperEvent.prototype, "reportedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], TamperEvent.prototype, "resolved", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'resolved_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], TamperEvent.prototype, "resolvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], TamperEvent.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], TamperEvent.prototype, "createdAt", void 0);
exports.TamperEvent = TamperEvent = __decorate([
    (0, typeorm_1.Index)('idx_tamper_events_device_id', ['deviceId']),
    (0, typeorm_1.Index)('idx_tamper_events_unresolved', ['deviceId'], {
        where: 'resolved = FALSE',
    }),
    (0, typeorm_1.Entity)('tamper_events')
], TamperEvent);
//# sourceMappingURL=tamper-event.entity.js.map