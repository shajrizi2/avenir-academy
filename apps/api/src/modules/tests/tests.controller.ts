import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth-user.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../generated/prisma/enums.js';
import { CreateTestDto } from './dto/create-test.dto.js';
import { PublishTestDto } from './dto/publish-test.dto.js';
import { ReplaceQuestionsDto } from './dto/replace-questions.dto.js';
import { UpdateTestDto } from './dto/update-test.dto.js';
import {
  type StaffTestRecord,
  type TestBuilderRecord,
  type TestResultsRecord,
  TestsService,
} from './tests.service.js';

/** Building and running a module's test: the module's instructor and admins only. */
@ApiTags('tests')
@ApiBearerAuth()
@Roles(Role.INSTRUCTOR, Role.ADMIN)
@Controller()
export class TestsController {
  constructor(private readonly tests: TestsService) {}

  @Get('modules/:id/test')
  builder(
    @CurrentUser() user: AuthUser,
    @Param('id') moduleId: string,
  ): Promise<TestBuilderRecord> {
    return this.tests.builder(user, moduleId);
  }

  @Post('modules/:id/test')
  create(
    @CurrentUser() user: AuthUser,
    @Param('id') moduleId: string,
    @Body() dto: CreateTestDto,
  ): Promise<StaffTestRecord> {
    return this.tests.create(user, moduleId, dto);
  }

  @Patch('tests/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTestDto,
  ): Promise<StaffTestRecord> {
    return this.tests.update(user, id, dto);
  }

  @Delete('tests/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    return this.tests.remove(user, id);
  }

  @Put('tests/:id/questions')
  replaceQuestions(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReplaceQuestionsDto,
  ): Promise<StaffTestRecord> {
    return this.tests.replaceQuestions(user, id, dto);
  }

  @Patch('tests/:id/publish')
  publish(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: PublishTestDto,
  ): Promise<StaffTestRecord> {
    return this.tests.publish(user, id, dto.isPublished);
  }

  @Get('tests/:id/results')
  results(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<TestResultsRecord> {
    return this.tests.results(user, id);
  }
}
