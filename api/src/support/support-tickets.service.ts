// Phase 7

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { OrderEntity } from '../orders/entities/order.entity';
import { UserEntity, UserRole } from '../users/entities/user.entity';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { SupportTicketMessageEntity } from './entities/support-ticket-message.entity';
import { SupportTicketEntity, TicketStatus } from './entities/support-ticket.entity';

const TICKET_RELATIONS = {
  order: true,
  assignedAgent: true,
  customer: true,
  messages: { sender: true },
} as const;

// Without an explicit order, Postgres returns a ticket's messages in
// whatever order it likes - a conversation has to read top to bottom.
const MESSAGES_OLDEST_FIRST = { messages: { createdAt: 'ASC' } } as const;

@Injectable()
export class SupportTicketsService {
  constructor(
    @InjectRepository(SupportTicketEntity)
    private readonly ticketRepo: Repository<SupportTicketEntity>,
    @InjectRepository(SupportTicketMessageEntity)
    private readonly messageRepo: Repository<SupportTicketMessageEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
  ) {}

  // ---- Customer-facing ----

  async createTicket(customerId: string, dto: CreateSupportTicketDto): Promise<SupportTicketEntity> {
    if (dto.orderId) {
      // A ticket can only reference an order that's actually the
      // customer's own - same ownership check as everywhere else in this
      // app that lets a customer reference one of their own records.
      const order = await this.orderRepo.findOne({ where: { id: dto.orderId, customerId } });
      if (!order) throw new BadRequestException('Order not found');
    }

    const ticket = this.ticketRepo.create({
      customerId,
      orderId: dto.orderId ?? null,
      category: dto.category,
      subject: dto.subject,
      description: dto.description,
    });
    return this.ticketRepo.save(ticket);
  }

  async findAllForCustomer(customerId: string): Promise<SupportTicketEntity[]> {
    return this.ticketRepo.find({
      where: { customerId },
      relations: { order: true },
      order: { updatedAt: 'DESC' },
    });
  }

  async findOneForCustomer(customerId: string, ticketId: string): Promise<SupportTicketEntity> {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId, customerId },
      relations: TICKET_RELATIONS,
      order: MESSAGES_OLDEST_FIRST,
    });
    if (!ticket) throw new NotFoundException('Support ticket not found');
    return ticket;
  }

  async addCustomerMessage(
    customerId: string,
    ticketId: string,
    dto: CreateTicketMessageDto,
  ): Promise<SupportTicketMessageEntity> {
    // findOneForCustomer already enforces ownership - reusing it here
    // instead of a separate query means there's only one place that
    // ownership check lives.
    const ticket = await this.findOneForCustomer(customerId, ticketId);
    return this.saveMessage(ticket, customerId, dto);
  }

  // ---- Support agent-facing ----

  async findQueue(status?: TicketStatus, assignedAgentId?: string): Promise<SupportTicketEntity[]> {
    return this.ticketRepo.find({
      where: {
        ...(status ? { status } : {}),
        ...(assignedAgentId ? { assignedAgentId } : {}),
      },
      relations: { order: true, assignedAgent: true, customer: true },
      order: { updatedAt: 'DESC' },
    });
  }

  async findOneForAgent(ticketId: string): Promise<SupportTicketEntity> {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId },
      relations: TICKET_RELATIONS,
      order: MESSAGES_OLDEST_FIRST,
    });
    if (!ticket) throw new NotFoundException('Support ticket not found');
    return ticket;
  }

  async addAgentMessage(
    agentId: string,
    ticketId: string,
    dto: CreateTicketMessageDto,
  ): Promise<SupportTicketMessageEntity> {
    const ticket = await this.findOneForAgent(ticketId);
    return this.saveMessage(ticket, agentId, dto);
  }

  async assignTicket(ticketId: string, dto: AssignTicketDto): Promise<SupportTicketEntity> {
    await this.findOneForAgent(ticketId);
    const agent = await this.userRepo.findOne({ where: { id: dto.agentId } });
    if (!agent || agent.role !== UserRole.SUPPORT_AGENT) {
      throw new BadRequestException('Tickets can only be assigned to a support agent');
    }
    // update() rather than save() on the loaded ticket - the loaded
    // assignedAgent relation (still the old agent, or null) would win over
    // the new assignedAgentId when TypeORM syncs them after a save, so the
    // response came back showing the old assignment. Re-fetching afterwards
    // returns what's actually in the database.
    await this.ticketRepo.update(ticketId, { assignedAgentId: dto.agentId });
    return this.findOneForAgent(ticketId);
  }

  async updateStatus(ticketId: string, dto: UpdateTicketStatusDto): Promise<SupportTicketEntity> {
    await this.findOneForAgent(ticketId);
    await this.ticketRepo.update(ticketId, {
      status: dto.status,
      // closedAt is a record of WHEN it was closed - only ever set going
      // forward into CLOSED, same reasoning as shipment.shippedDate/
      // deliveredDate only getting stamped the moment that status is reached.
      ...(dto.status === TicketStatus.CLOSED ? { closedAt: new Date() } : {}),
    });
    return this.findOneForAgent(ticketId);
  }

  // Shared by customer and agent replies. A closed ticket is finished -
  // to continue the conversation, an agent reopens it by changing its
  // status first.
  private async saveMessage(
    ticket: SupportTicketEntity,
    senderId: string,
    dto: CreateTicketMessageDto,
  ): Promise<SupportTicketMessageEntity> {
    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException('This ticket is closed');
    }
    const message = this.messageRepo.create({ ticketId: ticket.id, senderId, message: dto.message });
    const saved = await this.messageRepo.save(message);
    // A new message is activity on the ticket - bump its updated_at so the
    // agent queue's "recently updated" ordering reflects it. Set by the
    // database (NOW()) like every other updated_at, not by Node.
    await this.ticketRepo
      .createQueryBuilder()
      .update()
      .set({ updatedAt: () => 'NOW()' })
      .where('id = :id', { id: ticket.id })
      .execute();
    return saved;
  }

  // Active support agents only - the only valid targets for assignTicket().
  async findAgents(): Promise<UserEntity[]> {
    return this.userRepo.find({
      where: { role: UserRole.SUPPORT_AGENT, isActive: true },
      order: { firstName: 'ASC', lastName: 'ASC' },
    });
  }

  // ---- Customer lookup ----

  async searchCustomers(query: string | undefined): Promise<UserEntity[]> {
    const term = query?.trim();
    if (!term) {
      throw new BadRequestException('Search query is required');
    }
    return this.userRepo.find({
      where: [
        { role: UserRole.CUSTOMER, email: ILike(`%${term}%`) },
        { role: UserRole.CUSTOMER, firstName: ILike(`%${term}%`) },
        { role: UserRole.CUSTOMER, lastName: ILike(`%${term}%`) },
      ],
      take: 20,
    });
  }

  async getCustomerContext(
    customerId: string,
  ): Promise<{ profile: UserEntity; orders: OrderEntity[]; tickets: SupportTicketEntity[] }> {
    const profile = await this.userRepo.findOne({ where: { id: customerId, role: UserRole.CUSTOMER } });
    if (!profile) throw new NotFoundException('Customer not found');

    const [orders, tickets] = await Promise.all([
      this.orderRepo.find({ where: { customerId }, order: { createdAt: 'DESC' } }),
      this.ticketRepo.find({ where: { customerId }, order: { updatedAt: 'DESC' } }),
    ]);

    return { profile, orders, tickets };
  }
}
