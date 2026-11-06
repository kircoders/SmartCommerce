// Phase 9

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsWhere,
  ILike,
  In,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { OrderEntity } from '../orders/entities/order.entity';
import { ShipmentEntity } from '../shipments/entities/shipment.entity';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { ListIncidentsQueryDto } from './dto/list-incidents-query.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import {
  IncidentEntity,
  IncidentSeverity,
  IncidentStatus,
} from './entities/incident.entity';

// Where each status can go next. CLOSED is final.
const ALLOWED_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  [IncidentStatus.OPEN]: [IncidentStatus.IN_PROGRESS, IncidentStatus.RESOLVED],
  [IncidentStatus.IN_PROGRESS]: [IncidentStatus.RESOLVED],
  [IncidentStatus.RESOLVED]: [
    IncidentStatus.CLOSED,
    IncidentStatus.IN_PROGRESS,
  ],
  [IncidentStatus.CLOSED]: [],
};

// "Still needs someone's attention" - what the dashboard counts as open.
const UNRESOLVED_STATUSES = [IncidentStatus.OPEN, IncidentStatus.IN_PROGRESS];
const RECENTLY_RESOLVED_DAYS = 7;

const DETAIL_RELATIONS = {
  creator: true,
  order: true,
  shipment: true,
} as const;

export interface IncidentSummary {
  open: number;
  critical: number;
  recentlyResolved: number;
}

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(
    @InjectRepository(IncidentEntity)
    private readonly incidentRepo: Repository<IncidentEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(ShipmentEntity)
    private readonly shipmentRepo: Repository<ShipmentEntity>,
  ) {}

  async createIncident(
    userId: string,
    dto: CreateIncidentDto,
  ): Promise<IncidentEntity> {
    const { orderId, shipmentId } = await this.resolveLinks(
      dto.orderId,
      dto.shipmentId,
    );

    const incident = this.incidentRepo.create({
      createdBy: userId,
      orderId,
      shipmentId,
      type: dto.type,
      severity: dto.severity,
      title: dto.title,
      description: dto.description,
      notes: dto.notes ?? null,
    });
    const saved = await this.incidentRepo.save(incident);
    this.logger.log(
      `Incident ${saved.id} (${saved.severity} ${saved.type}) created by ${userId}`,
    );
    return this.findOne(saved.id);
  }

  async findAll(query: ListIncidentsQueryDto): Promise<IncidentEntity[]> {
    const filters: FindOptionsWhere<IncidentEntity> = {};
    if (query.status) filters.status = query.status;
    else if (query.unresolved) filters.status = In(UNRESOLVED_STATUSES);
    if (query.severity) filters.severity = query.severity;
    if (query.type) filters.type = query.type;

    // An array passed to `where` means OR - title matches OR description
    // matches, each combined with the same filters.
    const term = query.q?.trim();
    const where = term
      ? [
          { ...filters, title: ILike(`%${term}%`) },
          { ...filters, description: ILike(`%${term}%`) },
        ]
      : filters;

    return this.incidentRepo.find({
      where,
      relations: { creator: true },
      order: { updatedAt: 'DESC' },
    });
  }

  async getSummary(): Promise<IncidentSummary> {
    const since = new Date(
      Date.now() - RECENTLY_RESOLVED_DAYS * 24 * 60 * 60 * 1000,
    );
    const [open, critical, recentlyResolved] = await Promise.all([
      this.incidentRepo.count({ where: { status: In(UNRESOLVED_STATUSES) } }),
      this.incidentRepo.count({
        where: {
          status: In(UNRESOLVED_STATUSES),
          severity: IncidentSeverity.CRITICAL,
        },
      }),
      // resolved_at is cleared on reopen, so this covers RESOLVED and
      // CLOSED incidents that were resolved recently.
      this.incidentRepo.count({
        where: { resolvedAt: MoreThanOrEqual(since) },
      }),
    ]);
    return { open, critical, recentlyResolved };
  }

  async findOne(id: string): Promise<IncidentEntity> {
    const incident = await this.incidentRepo.findOne({
      where: { id },
      relations: DETAIL_RELATIONS,
    });
    if (!incident) throw new NotFoundException('Incident not found');
    return incident;
  }

  async updateIncident(
    id: string,
    dto: UpdateIncidentDto,
  ): Promise<IncidentEntity> {
    const changes: Partial<IncidentEntity> = {};
    if (dto.title !== undefined) changes.title = dto.title;
    if (dto.type !== undefined) changes.type = dto.type;
    if (dto.severity !== undefined) changes.severity = dto.severity;
    if (dto.description !== undefined) changes.description = dto.description;
    if (dto.notes !== undefined) changes.notes = dto.notes || null;
    if (Object.keys(changes).length === 0) {
      throw new BadRequestException('Send at least one field to update');
    }

    const incident = await this.findOne(id);
    if (incident.status === IncidentStatus.CLOSED) {
      throw new BadRequestException("A closed incident can't be edited");
    }

    await this.incidentRepo.update(id, changes);
    return this.findOne(id);
  }

  async updateStatus(
    id: string,
    status: IncidentStatus,
  ): Promise<IncidentEntity> {
    const incident = await this.findOne(id);
    if (incident.status === status) return incident;

    if (!ALLOWED_TRANSITIONS[incident.status].includes(status)) {
      throw new BadRequestException(
        `Can't change an incident from ${incident.status} to ${status}`,
      );
    }

    const changes: Partial<IncidentEntity> = { status };
    if (status === IncidentStatus.RESOLVED) changes.resolvedAt = new Date();
    if (status === IncidentStatus.IN_PROGRESS) changes.resolvedAt = null;

    await this.incidentRepo.update(id, changes);
    this.logger.log(`Incident ${id}: ${incident.status} -> ${status}`);
    return this.findOne(id);
  }

  resolve(id: string): Promise<IncidentEntity> {
    return this.updateStatus(id, IncidentStatus.RESOLVED);
  }

  // Checks that linked records exist. A shipment linked without an order
  // brings its order along; one linked with an order has to belong to it.
  private async resolveLinks(
    orderId: string | undefined,
    shipmentId: string | undefined,
  ): Promise<{ orderId: string | null; shipmentId: string | null }> {
    if (orderId && !(await this.orderRepo.existsBy({ id: orderId }))) {
      throw new NotFoundException('Order not found');
    }

    if (!shipmentId) return { orderId: orderId ?? null, shipmentId: null };

    const shipment = await this.shipmentRepo.findOneBy({ id: shipmentId });
    if (!shipment) throw new NotFoundException('Shipment not found');
    if (orderId && shipment.orderId !== orderId) {
      throw new BadRequestException(
        "That shipment doesn't belong to that order",
      );
    }
    return { orderId: shipment.orderId, shipmentId };
  }
}
