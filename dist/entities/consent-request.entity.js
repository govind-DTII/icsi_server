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
exports.ConsentRequest = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
let ConsentRequest = class ConsentRequest {
};
exports.ConsentRequest = ConsentRequest;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ConsentRequest.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], ConsentRequest.prototype, "txnRef", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ConsentRequest.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 32,
        default: 'PENDING_OWNER_APPROVAL',
    }),
    __metadata("design:type", String)
], ConsentRequest.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ConsentRequest.prototype, "scope", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ConsentRequest.prototype, "blePayload", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ConsentRequest.prototype, "blePacketRaw", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ConsentRequest.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ConsentRequest.prototype, "fileUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ConsentRequest.prototype, "fileName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'integer' }),
    __metadata("design:type", Number)
], ConsentRequest.prototype, "fileSize", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'attachment_name', nullable: true, length: 255 }),
    __metadata("design:type", String)
], ConsentRequest.prototype, "attachmentName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'attachment_url', nullable: true, type: 'text' }),
    __metadata("design:type", String)
], ConsentRequest.prototype, "attachmentUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'attachment_hash', nullable: true, length: 80 }),
    __metadata("design:type", String)
], ConsentRequest.prototype, "attachmentHash", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'operator_latitude',
        type: 'double precision',
        nullable: true,
    }),
    __metadata("design:type", Number)
], ConsentRequest.prototype, "operatorLatitude", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'operator_longitude',
        type: 'double precision',
        nullable: true,
    }),
    __metadata("design:type", Number)
], ConsentRequest.prototype, "operatorLongitude", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'operator_location_accuracy',
        type: 'double precision',
        nullable: true,
    }),
    __metadata("design:type", Number)
], ConsentRequest.prototype, "operatorLocationAccuracy", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'operator_location_captured_at',
        type: 'timestamptz',
        nullable: true,
    }),
    __metadata("design:type", Date)
], ConsentRequest.prototype, "operatorLocationCapturedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'operator_street', type: 'text', nullable: true }),
    __metadata("design:type", String)
], ConsentRequest.prototype, "operatorStreet", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'operator_city', length: 120, nullable: true }),
    __metadata("design:type", String)
], ConsentRequest.prototype, "operatorCity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'operator_state', length: 120, nullable: true }),
    __metadata("design:type", String)
], ConsentRequest.prototype, "operatorState", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'operator_postal_code', length: 32, nullable: true }),
    __metadata("design:type", String)
], ConsentRequest.prototype, "operatorPostalCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'FCM · BLE relay' }),
    __metadata("design:type", String)
], ConsentRequest.prototype, "delivery", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'consent_id', nullable: true, unique: true }),
    __metadata("design:type", String)
], ConsentRequest.prototype, "consentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'aborted_reason', nullable: true }),
    __metadata("design:type", String)
], ConsentRequest.prototype, "abortedReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ConsentRequest.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expires_at', nullable: true, type: 'bigint' }),
    __metadata("design:type", Number)
], ConsentRequest.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'decision_deadline_ms', nullable: true, type: 'bigint' }),
    __metadata("design:type", Number)
], ConsentRequest.prototype, "decisionDeadlineMs", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'session_id', nullable: true }),
    __metadata("design:type", String)
], ConsentRequest.prototype, "sessionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'device_id', nullable: true, length: 32 }),
    __metadata("design:type", String)
], ConsentRequest.prototype, "deviceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], ConsentRequest.prototype, "approvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], ConsentRequest.prototype, "rejectedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.Index)(),
    __metadata("design:type", user_entity_1.User)
], ConsentRequest.prototype, "owner", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.Index)(),
    __metadata("design:type", user_entity_1.User)
], ConsentRequest.prototype, "operator", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ConsentRequest.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ConsentRequest.prototype, "updatedAt", void 0);
exports.ConsentRequest = ConsentRequest = __decorate([
    (0, typeorm_1.Entity)('consent_requests'),
    (0, typeorm_1.Check)('consent_requests_status_spec_check', `status IN ('PENDING_OWNER_APPROVAL','APPROVED','REJECTED','EXPIRED','TAMPER_ABORTED')`)
], ConsentRequest);
//# sourceMappingURL=consent-request.entity.js.map