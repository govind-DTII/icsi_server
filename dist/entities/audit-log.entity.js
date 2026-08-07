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
exports.AuditLog = void 0;
const typeorm_1 = require("typeorm");
const consent_request_entity_1 = require("./consent-request.entity");
let AuditLog = class AuditLog {
};
exports.AuditLog = AuditLog;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AuditLog.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], AuditLog.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'text' }),
    __metadata("design:type", String)
], AuditLog.prototype, "detail", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['approve', 'reject', 'login', 'ble', 'system'],
        default: 'system',
    }),
    __metadata("design:type", String)
], AuditLog.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "actorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "actorRole", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "actorName", void 0);
__decorate([
    (0, typeorm_1.Index)('idx_audit_logs_consent_id'),
    (0, typeorm_1.Column)({ name: 'consent_id', length: 64, nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "consentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 32, nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "txn", void 0);
__decorate([
    (0, typeorm_1.Index)('idx_audit_logs_session_id'),
    (0, typeorm_1.Column)({ name: 'session_id', length: 64, nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "sessionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'device_id', length: 32, nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "deviceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'document_name', length: 255, nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "documentName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'attachment_hash', length: 80, nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "attachmentHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_url', type: 'text', nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "fileUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'double precision', nullable: true }),
    __metadata("design:type", Number)
], AuditLog.prototype, "latitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'double precision', nullable: true }),
    __metadata("design:type", Number)
], AuditLog.prototype, "longitude", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'location_accuracy',
        type: 'double precision',
        nullable: true,
    }),
    __metadata("design:type", Number)
], AuditLog.prototype, "locationAccuracy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'street', type: 'text', nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "street", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'city', length: 120, nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'state', length: 120, nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "state", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'postal_code', length: 32, nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "postalCode", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => consent_request_entity_1.ConsentRequest, { nullable: true }),
    __metadata("design:type", consent_request_entity_1.ConsentRequest)
], AuditLog.prototype, "consentRequest", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], AuditLog.prototype, "createdAt", void 0);
exports.AuditLog = AuditLog = __decorate([
    (0, typeorm_1.Entity)('audit_logs')
], AuditLog);
//# sourceMappingURL=audit-log.entity.js.map