// Phase 8

import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { CreateReturnDto } from './dto/create-return.dto';
import { ReturnEvidenceEntity } from './entities/return-evidence.entity';
import { ReturnEntity } from './entities/return.entity';
import { ReturnsService } from './returns.service';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// CUSTOMER only - every lookup is filtered by the caller's own id, so
// another customer's return is a 404, same as support tickets.
@ApiTags('returns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post()
  @ApiOperation({
    summary: 'Request a return for items from a delivered order',
  })
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateReturnDto,
  ): Promise<{ data: ReturnEntity }> {
    const data = await this.returnsService.createReturn(user.id, dto);
    return { data };
  }

  @Get('me')
  @ApiOperation({ summary: "List the current customer's own returns" })
  async findMine(
    @CurrentUser() user: { id: string },
  ): Promise<{ data: ReturnEntity[] }> {
    const data = await this.returnsService.findAllForCustomer(user.id);
    return { data };
  }

  @Get('me/:id')
  @ApiOperation({
    summary:
      "Get one of the current customer's returns, with items, photos, and refund",
  })
  async findOneMine(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: ReturnEntity }> {
    const data = await this.returnsService.findOneForCustomer(user.id, id);
    return { data };
  }

  // multipart/form-data with one image in a field named "file" - same as
  // product image uploads. Call once per photo (max 5 per return).
  @Post(':id/evidence')
  @ApiOperation({
    summary:
      'Upload a photo (JPEG/PNG/WebP, max 5 MB) to a return that is still REQUESTED',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_PHOTO_BYTES } }),
  )
  async uploadEvidence(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: { buffer: Buffer; mimetype: string } | undefined,
  ): Promise<{ data: ReturnEvidenceEntity }> {
    const data = await this.returnsService.uploadEvidence(user.id, id, file);
    return { data };
  }
}
