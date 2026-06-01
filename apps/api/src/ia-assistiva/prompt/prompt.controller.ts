import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { PromptService } from './prompt.service';
import {
  CreatePromptTemplateDtoClass,
  UpdatePromptTemplateDtoClass,
} from '../dto/prompt-template.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@Controller('ia/prompts')
@UseGuards(JwtAuthGuard)
export class PromptController {
  constructor(private readonly promptService: PromptService) {}

  /**
   * POST /ia/prompts
   * Cria um novo template de prompt.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreatePromptTemplateDtoClass,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.promptService.create({
      name: dto.name,
      description: dto.description,
      template: dto.template,
      variables: dto.variables,
      createdBy: user.sub,
    });
  }

  /**
   * GET /ia/prompts
   * Lista templates com filtros opcionais.
   */
  @Get()
  findAll(
    @Query('active') active?: string,
    @Query('name') name?: string,
  ) {
    return this.promptService.findAll({
      active: active !== undefined ? active === 'true' : undefined,
      name,
    });
  }

  /**
   * GET /ia/prompts/:id
   * Busca um template por ID.
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.promptService.findOne(id);
  }

  /**
   * PATCH /ia/prompts/:id
   * Atualiza um template (incrementa versão automaticamente).
   */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePromptTemplateDtoClass,
  ) {
    return this.promptService.update(id, {
      name: dto.name,
      description: dto.description,
      template: dto.template,
      variables: dto.variables,
      active: dto.active,
    });
  }

  /**
   * DELETE /ia/prompts/:id
   * Desativa um template (soft delete — não remove do banco).
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  deactivate(@Param('id') id: string) {
    return this.promptService.deactivate(id);
  }
}
