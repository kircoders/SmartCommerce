// Phase 11

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export const MAX_CHAT_MESSAGE_LENGTH = 2000;
export const MAX_CHAT_HISTORY = 20;

// One earlier turn of the conversation. The server doesn't store chats, so
// the browser sends back what was said so far - that's how follow-up
// questions ("and when will it arrive?") make sense to the AI.
export class ChatTurnDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @ApiProperty({ example: "Where's my order?" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content!: string;
}

export class CustomerChatDto {
  @ApiProperty({ example: 'Has my last order shipped yet?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_CHAT_MESSAGE_LENGTH)
  message!: string;

  @ApiPropertyOptional({
    type: [ChatTurnDto],
    description: `Earlier turns, oldest first (max ${MAX_CHAT_HISTORY})`,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_CHAT_HISTORY)
  @ValidateNested({ each: true })
  @Type(() => ChatTurnDto)
  history?: ChatTurnDto[];
}
