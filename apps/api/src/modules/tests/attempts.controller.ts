import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth-user.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../generated/prisma/enums.js';
import {
  type AttemptResultRecord,
  type AttemptSessionRecord,
  AttemptsService,
  type StudentTestRecord,
} from './attempts.service.js';
import { SaveAnswersDto, SubmitAttemptDto } from './dto/save-answers.dto.js';

/** Taking a test: students only. Responses never contain the correct answers. */
@ApiTags('tests')
@ApiBearerAuth()
@Roles(Role.STUDENT)
@Controller()
export class AttemptsController {
  constructor(private readonly attempts: AttemptsService) {}

  @Get('tests/:id')
  overview(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<StudentTestRecord> {
    return this.attempts.overview(user, id);
  }

  /** Starts an attempt, or returns the one already in progress. */
  @Post('tests/:id/attempts')
  @HttpCode(HttpStatus.OK)
  start(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<AttemptSessionRecord> {
    return this.attempts.start(user, id);
  }

  @Get('attempts/:id')
  session(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<AttemptSessionRecord> {
    return this.attempts.session(user, id);
  }

  /** Autosave. */
  @Patch('attempts/:id')
  save(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SaveAnswersDto,
  ): Promise<{ savedAt: Date }> {
    return this.attempts.save(user, id, dto.answers);
  }

  @Post('attempts/:id/submit')
  @HttpCode(HttpStatus.OK)
  submit(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SubmitAttemptDto,
  ): Promise<AttemptResultRecord> {
    return this.attempts.submit(user, id, dto.answers);
  }
}
