// Phase 1

import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnnouncementsService } from './announcements.service';

@ApiTags('announcements')
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get('banner')
  @ApiOperation({ summary: 'Get the current site-wide banner message, if any (public, no auth)' })
  async getBanner(): Promise<{ data: { message: string } }> {
    const message = await this.announcementsService.getBanner();
    return { data: { message } };
  }
}
