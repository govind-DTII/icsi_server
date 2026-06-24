import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TamperEvent } from './entities/tamper-event.entity';
import { CreateTamperEventDto } from './dto/create-tamper-event.dto';
import { ConsentService } from '../consent/consent.service';
import { SessionsService } from '../sessions/sessions.service';
import { EndReason } from '../sessions/dto/session.dto';
import { BleEventsService } from '../ble-events/ble-events.service';
import { LoggerService } from '../logging/logger.service';

@Injectable()
export class TamperService {
  constructor(
    @InjectRepository(TamperEvent)
    private tamperRepo: Repository<TamperEvent>,
    private readonly consentService: ConsentService,
    private readonly sessionsService: SessionsService,
    private readonly bleEventsService: BleEventsService,
    private readonly appLog: LoggerService,
    private readonly dataSource: DataSource,
  ) {}

  async log(dto: CreateTamperEventDto): Promise<TamperEvent> {
    const event = this.tamperRepo.create({
      deviceId: dto.deviceId,
      sessionId: dto.sessionId,
      consentId: dto.consentId,
      detectedAt: new Date(dto.detectedAt),
      reportedBy: dto.reportedBy,
      notes: dto.notes,
    });
    // Atomic cascade: the tamper event, the consent abort, and the device-wide
    // session hard-close all commit or roll back together. Without this, a
    // failure after the consent abort could leave sessions open on a tampered
    // device. The audit/event trail writes below stay best-effort (per the
    // codebase's "telemetry must never fail a business op" design).
    await this.dataSource.transaction(async (manager) => {
      await manager.save(event);

      // a. Abort the in-flight consent if one is referenced
      if (dto.consentId) {
        await this.consentService.markAborted(
          dto.consentId,
          'TAMPER_DETECTED',
          manager,
        );
      }

      // b. Hard-close every open session on this device
      await this.sessionsService.endAllActive(
        dto.deviceId,
        EndReason.TAMPER,
        manager,
      );
    });

    // c. Append to the BLE event audit trail (best-effort, outside the txn)
    await this.bleEventsService.recordEvent({
      eventType: 'TAMPER_DETECTED',
      direction: 'FW_TO_APP',
      sessionId: dto.sessionId,
      consentId: dto.consentId,
      payloadSummary: { reportedBy: dto.reportedBy },
    });

    this.appLog.log(`tamper detected (${dto.reportedBy})`, {
      service: 'tamper',
      eventType: 'TAMPER_DETECTED',
      deviceId: dto.deviceId,
      sessionId: dto.sessionId,
      consentId: dto.consentId,
      errorCode: 'TAMPER',
    });

    return event;
  }

  async findUnresolvedForDevice(deviceId: string): Promise<TamperEvent[]> {
    return this.tamperRepo.find({
      where: { deviceId, resolved: false },
      order: { detectedAt: 'DESC' },
    });
  }

  async markResolved(id: string, notes?: string): Promise<TamperEvent> {
    const event = await this.tamperRepo.findOne({ where: { id } });
    if (!event) throw new NotFoundException(`Tamper event ${id} not found`);
    event.resolved = true;
    event.resolvedAt = new Date();
    if (notes !== undefined) event.notes = notes;
    const saved = await this.tamperRepo.save(event);
    this.appLog.log(`tamper resolved (${id})`, {
      service: 'tamper',
      eventType: 'TAMPER_RESOLVED',
      deviceId: saved.deviceId,
      sessionId: saved.sessionId,
      consentId: saved.consentId,
    });
    return saved;
  }
}
