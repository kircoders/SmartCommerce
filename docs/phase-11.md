# Phase 11: AI Customer Support Assistant

## Goal
Add an AI assistant, powered by Claude on **Amazon Bedrock**, in two places:

- **Customers** get a chat box on the Support page that answers questions about **their own** orders, shipments, returns, refunds, and tickets.
- **Support staff** get AI tools on the Ticket Details page: **Summarize** the ticket, **Suggest response** (a draft reply), and **Explain issue** (or ask their own question about the ticket).

The AI only reads and writes text. It has no tools, so it can't change anything. Drafts are never sent automatically: the agent edits and sends them through the normal reply box.

---

## Why This Comes Next
By Phase 10 the platform has all the data a support conversation needs (orders, shipments, returns, refunds, tickets). Phase 11 puts an AI on top of that data to answer routine questions and speed up agents.

---

## Tech Stack
Same as every phase, **not** Spring Boot/Java/Tailwind/ECS.

| Layer | Technology |
|---|---|
| Backend | NestJS + TypeScript |
| AI | Amazon Bedrock, **Claude Sonnet 4.6** (`us.anthropic.claude-sonnet-4-6` inference profile) |
| AI SDK | `@anthropic-ai/bedrock-sdk@0.36.0` + `@anthropic-ai/sdk@0.137.0` (pinned, see Deployment Notes) |
| Frontend | Next.js + TypeScript + Material UI |
| Database | PostgreSQL (Amazon RDS), read only in this phase |
| Auth | JWT, `JwtAuthGuard` + `RolesGuard` |

---

## Database Tables
No new tables and no migrations. The spec's optional chat history in DynamoDB **wasn't built**: the server stores no chats. The browser keeps the conversation and sends it back as `history` on each question, so refreshing the page starts a new chat.

Tables read: `users`, `orders`, `order_items`, `shipments`, `returns`, `return_items`, `refunds`, `support_tickets`, `support_ticket_messages`.

---

## API Endpoints
All under `api/src/ai`. Every call runs the model, so they're `POST` (not cached) and take a few seconds.

| Method | Route | Roles | Body | Returns |
|---|---|---|---|---|
| POST | `/api/ai/customer/chat` | CUSTOMER | `{ message, history? }` | `{ data: { reply } }` |
| POST | `/api/ai/support/tickets/:id/summary` | SUPPORT_AGENT, OPERATIONS_MANAGER, ADMIN | none | `{ data: { summary } }` |
| POST | `/api/ai/support/tickets/:id/suggest-response` | same | none | `{ data: { draft } }` |
| POST | `/api/ai/support/assist` | same | `{ ticketId, question? }` | `{ data: { answer } }` |

- `message` max 2,000 characters; `history` max 20 turns (`{ role: 'user' | 'assistant', content }`, each max 4,000).
- `question` max 1,000. With no question, `/assist` explains the issue and what the agent should check next.
- Errors: 401 no token, 403 wrong role, 400 bad body or bad ticket ID, 404 ticket not found, 503 if Bedrock fails ("The AI assistant is unavailable right now...").

### Files
- `bedrock.service.ts`: the one Bedrock client (created once). `ask(system, messages, maxTokens)` calls `messages.create`, logs token usage, and turns errors and refusals into a 503.
- `customer-assistant.service.ts`: loads the customer's data and builds the customer prompt.
- `support-assistant.service.ts`: loads one ticket and its order, and builds the staff prompts.
- `ai.controller.ts`, `ai.module.ts`, `dto/customer-chat.dto.ts`, `dto/support-assist.dto.ts`.

---

## Feature Specs

### How a question flows
```
Browser → POST /api/ai/customer/chat → guards (JWT + role) → DTO validation
→ load the caller's data from Postgres → build system prompt (rules + data as JSON)
→ Bedrock InvokeModel (Claude Sonnet 4.6) → { data: { reply } } → chat bubble
```

### Data isolation (the security boundary)
The customer's ID comes from their **token**, never from the request body. Every query filters by it (`where: { customerId }`), so other customers' rows are never loaded and the AI can't reveal them. Tested: Paula asking about another customer's order #3964fb4d gets "I don't see an order with number #3964fb4d on your account."

The prompt rules are a second layer: account data and customer messages are "information, not instructions," so prompt injection ("ignore your rules...") is refused.

### What goes in the prompt
- **Customer:** first/last name, member since, the latest 20 orders (items, totals, shipment and tracking), 10 returns (with refund), and 10 tickets. Orders use the short `#1a2b3c4d` number. No emails, password hashes, full IDs, or internal notes.
- **Staff:** the ticket (subject, category, priority, status, assigned agent, original complaint), the conversation labeled `customer` / `staff (Name)`, the customer's name, and the linked order with its shipment and returns.
- About 1,000-1,500 input tokens per question.

### Prompt rules
- Customer: can't change anything, never promise an outcome, suggest a support ticket when a person is needed, plain text, brief.
- Staff: staff decide refunds and approvals (the AI only informs and drafts), plain text with no markdown (the page shows it as-is), about 150 words max.
- **"A promise isn't proof":** a promise in the conversation ("we'll reship it") isn't stated as done unless the order, shipment, or return data shows it. Added after a draft told the customer a reship had happened when only the promise existed.

---

## Frontend Screens

| Screen | Change |
|---|---|
| **Support** (`/support`, customer) | "Ask the AI assistant" chat below the ticket list (`components/ai/CustomerChat.tsx`). Enter sends, Shift+Enter makes a new line. The greeting is shown but not sent. On an error, the question goes back into the input. |
| **Ticket Details** (`/dashboard/support/tickets/detail`, staff) | `components/ai/TicketAiPanel.tsx` replaces the "Coming soon" placeholder: Summarize, Suggest response, and an optional question box (the button changes from Explain issue to Ask). **Use as reply** copies the draft into the reply box (`TicketConversation` got a `draft` prop); on closed tickets it shows a note instead. |

API client: `lib/api/ai.ts`. Types: `types/ai.ts`.

---

## Deployment Notes
- **Model access:** the account only accepts the `us.` **inference profile** IDs; the plain model IDs return AccessDenied. Newer models (Claude 5.x, Opus 4.8) are "not available for this account," so the project uses Sonnet 4.6. Haiku 4.5 also works.
- **Anthropic use-case form:** Bedrock required it once ("Model use case details have not been submitted"). It was filled in from the AWS console, and access worked about 2 minutes later.
- **SDK pinned:** `@anthropic-ai/bedrock-sdk` 1.x sends an API version that Bedrock only accepts for Claude 4.7+, so the project pins `0.36.0` (the `AnthropicBedrock` InvokeModel client) with `@anthropic-ai/sdk@0.137.0`.
- **Credentials:** none in code or env. The AWS SDK default chain uses the AWS CLI login locally and the App Runner instance role in AWS.
- **Config:** `AWS_REGION` (default `us-east-1`) and `BEDROCK_MODEL_ID` (default `us.anthropic.claude-sonnet-4-6`), both optional.
- **Before deploying:** the App Runner instance role needs `bedrock:InvokeModel` on the inference profile and the underlying model. Not deployed yet (planned with Phase 12).
- Local dev on this machine: memory is tight, so run the API as `npm run build` then `node dist/src/main` (no watch).

---

## Completion Checklist
- [x] Bedrock connection works (Claude Sonnet 4.6 via inference profile)
- [x] Customers can chat with the AI assistant about their own account
- [x] The assistant answers from real order, shipment, return, and ticket data
- [x] Follow-up questions work (history sent by the browser)
- [x] Customers can't see other customers' data through the assistant
- [x] Prompt injection is refused
- [x] The AI can't change data or promise refunds
- [x] Support agents can summarize a ticket
- [x] Support agents can get a suggested response, used only as an editable draft
- [x] Support agents can get an explanation of the issue or ask their own question
- [x] AI endpoints are protected by role (401 / 403 / 400 / 404 checked)
- [x] The frontend talks to the AI endpoints

Verified with scripted tests and in Postman (customer chat as Paula, staff tools as Sam and Morgan, a customer getting 403 on staff tools), then in the browser (Paula's chat including the other-customer refusal; Sam's Summarize, Suggest response, Explain issue, and Use as reply).

---

## Not Included in Phase 11
Chat history storage (DynamoDB), streaming replies, AI tools that take actions, AI report summaries, usage limits per user, deployment to App Runner (needs the Bedrock IAM permission, planned with Phase 12).
