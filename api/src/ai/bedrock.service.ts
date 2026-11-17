// Phase 11

// WHAT THIS FILE IS:
// The only place in the backend that talks to Amazon Bedrock. Everything
// else (customer chat, ticket summaries, suggested replies) decides WHAT to
// ask; this service handles HOW: send the instructions + conversation to
// Claude and hand back the text of the answer.
//
// If anything goes wrong (Bedrock down, timeout, no permission, the model
// refuses), the caller gets a friendly 503 and the real error goes to the
// server log - AWS details never reach the browser.
//
// SDK note: @anthropic-ai/bedrock-sdk is pinned to 0.36.0. Releases from 1.0
// send a newer API version that Bedrock only accepts for Claude 4.7+, and
// this account can only use Sonnet 4.6 / Haiku 4.5 right now.

import { AnthropicBedrock } from '@anthropic-ai/bedrock-sdk';
import Anthropic from '@anthropic-ai/sdk';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const AI_UNAVAILABLE_MESSAGE =
  'The AI assistant is unavailable right now. Please try again in a moment, or contact our support team.';

const DEFAULT_MAX_TOKENS = 2048;
const TIMEOUT_MS = 60_000;

@Injectable()
export class BedrockService {
  private readonly logger = new Logger(BedrockService.name);
  private readonly client: AnthropicBedrock;
  private readonly modelId: string;

  constructor(config: ConfigService) {
    this.modelId = config.getOrThrow<string>('ai.modelId');
    this.client = new AnthropicBedrock({
      awsRegion: config.getOrThrow<string>('ai.region'),
      timeout: TIMEOUT_MS,
      maxRetries: 2,
    });
  }

  /**
   * Sends one request to Claude and returns the answer as plain text.
   * `system` = the instructions (who the AI is, the rules, the data it may use).
   * `messages` = the conversation so far, ending with the user's latest message.
   */
  async ask(
    system: string,
    messages: Anthropic.MessageParam[],
    maxTokens = DEFAULT_MAX_TOKENS,
  ): Promise<string> {
    let response: Anthropic.Message;
    try {
      response = await this.client.messages.create({
        model: this.modelId,
        max_tokens: maxTokens,
        system,
        messages,
      });
    } catch (error: unknown) {
      this.logger.error(`Bedrock request failed: ${describeError(error)}`);
      throw new ServiceUnavailableException(AI_UNAVAILABLE_MESSAGE);
    }

    const { input_tokens, output_tokens } = response.usage;
    this.logger.log(
      `Bedrock ${this.modelId}: ${input_tokens} in / ${output_tokens} out tokens, stop=${response.stop_reason ?? 'none'}`,
    );

    if (response.stop_reason === 'refusal') {
      this.logger.warn('Bedrock declined to answer (stop_reason=refusal)');
      throw new ServiceUnavailableException(AI_UNAVAILABLE_MESSAGE);
    }
    if (response.stop_reason === 'max_tokens') {
      this.logger.warn(`Bedrock answer was cut off at max_tokens=${maxTokens}`);
    }

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim();

    if (!text) {
      this.logger.warn('Bedrock returned no text');
      throw new ServiceUnavailableException(AI_UNAVAILABLE_MESSAGE);
    }
    return text;
  }
}

function describeError(error: unknown): string {
  if (error instanceof Anthropic.APIError) {
    return `${error.status ?? 'no status'} ${error.name}: ${error.message}`;
  }
  return error instanceof Error
    ? `${error.name}: ${error.message}`
    : String(error);
}
