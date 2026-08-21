import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

// ---- Swagger DTOs (separate from Zod schemas) ----
export class RegisterBodyDto {
  @ApiProperty({ example: 'user@example.com' }) email!: string;
  @ApiProperty({ example: 'Password123', minLength: 8 }) password!: string;
  @ApiProperty({ example: 'John' }) firstName!: string;
  @ApiProperty({ example: 'Doe' }) lastName!: string;
}

export class LoginBodyDto {
  @ApiProperty({ example: 'user@example.com' }) email!: string;
  @ApiProperty({ example: 'Password123' }) password!: string;
}

export class UserResponseDto {
  @ApiProperty({ example: '019a...' }) id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty({ enum: ['pending_verification', 'active', 'suspended'] })
  status!: string;
  @ApiProperty({ nullable: true, example: null }) emailVerifiedAt!:
    string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class MessageDto {
  @ApiProperty({ example: 'Logged out' }) message!: string;
}

// ---- Composed decorators ----
export const ApiRegisterDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Register new user',
      description: 'Creates user + session cookie',
    }),
    ApiBody({
      type: RegisterBodyDto,
      examples: {
        example: {
          value: {
            email: 'user@example.com',
            password: 'Password123',
            firstName: 'John',
            lastName: 'Doe',
          },
        },
      },
    }),
    ApiCreatedResponse({ description: 'User created', type: UserResponseDto }),
    ApiConflictResponse({ description: 'Email already registered' }),
    ApiBadRequestResponse({ description: 'Validation failed' }),
  );

export const ApiLoginDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Login',
      description: 'Authenticates user + sets session cookie',
    }),
    ApiBody({ type: LoginBodyDto }),
    ApiOkResponse({ description: 'Authenticated', type: UserResponseDto }),
    ApiUnauthorizedResponse({
      description: 'Invalid credentials / account not active',
    }),
    ApiBadRequestResponse({ description: 'Validation failed' }),
  );

export const ApiMeDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get current user' }),
    ApiOkResponse({ type: UserResponseDto }),
    ApiUnauthorizedResponse({ description: 'No session / invalid or expired' }),
  );

export const ApiLogoutDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Logout current session' }),
    ApiOkResponse({ type: MessageDto }),
    ApiUnauthorizedResponse({ description: 'No session' }),
  );

export const ApiLogoutAllDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Logout all sessions' }),
    ApiOkResponse({ type: MessageDto }),
    ApiUnauthorizedResponse({ description: 'No session' }),
  );
