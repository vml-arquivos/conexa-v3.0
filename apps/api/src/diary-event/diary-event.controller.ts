import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DiaryEventService } from './diary-event.service';
import { CreateDiaryEventDto } from './dto/create-diary-event.dto';
import { UpdateDiaryEventDto } from './dto/update-diary-event.dto';
import { QueryDiaryEventDto } from './dto/query-diary-event.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ScopeGuard } from '../common/guards/scope.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('diary-events')
@UseGuards(JwtAuthGuard, RolesGuard, ScopeGuard)
export class DiaryEventController {
  constructor(private readonly diaryEventService: DiaryEventService) {}

  /**
   * POST /diary-events
   * Cria um novo evento no diário de bordo
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createDiaryEventDto: CreateDiaryEventDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.diaryEventService.create(createDiaryEventDto, user);
  }

  /**
   * GET /diary-events
   * Lista eventos com filtros opcionais
   */
  @Get()
  findAll(@Query() query: QueryDiaryEventDto, @CurrentUser() user: JwtPayload) {
    return this.diaryEventService.findAll(query, user);
  }

  /**
   * GET /diary-events/:id
   * Busca um evento específico por ID
   */
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.diaryEventService.findOne(id, user);
  }

  /**
   * PATCH /diary-events/:id
   * Atualiza um evento existente
   */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDiaryEventDto: UpdateDiaryEventDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.diaryEventService.update(id, updateDiaryEventDto, user);
  }

  /**
   * DELETE /diary-events/:id
   * Remove um evento (soft delete)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.diaryEventService.remove(id, user);
  }

  /**
   * POST /diary-events/:id/media
   * Upload de foto via multipart/form-data — resolve erro 413 (base64 no JSON).
   * Campo: file (image/*)
   * Limite: 5 MB
   */
  @Post(':id/media')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  uploadMedia(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.diaryEventService.uploadMedia(id, file, user);
  }
}
