# JobPilot — Phase 2 Implementation Plan

> **Scope:** Candidate Profile and CV Intelligence (TRD §10, Guide Phase 2).
> Turns a CV into structured, reviewable, user-approved candidate data.
> This file records the agreed decisions and the step-by-step build order.

---

## 0. Locked Decisions

| Concern | Decision |
|---|---|
| AI provider | Interface-first: `AiCompletionClient` + `AI_PROVIDER` env switch. Start with `stub`; add `anthropic`, and a generic `openai-compat` client later (covers Claude/Gemini-compat/Ollama/opencode Zen) |
| Upload limits | Max 10MB; allowlist `application/pdf` + DOCX mime only |
| File storage | `LocalStorageProvider` writing to `backend/storage/resumes/<userId>/<uuid>.<ext>`; folder gitignored; DB stores only `storageKey`. Cloud provider = same interface, later |
| Worker placement | In-app RabbitMQ consumer inside main app. Escape hatch: `WORKER_STANDALONE=true` boots consumer without HTTP listener. Extraction deferred until scaling demands it |
| CandidateProfile creation | Automatically in same transaction as user registration (Guide 2.1) |
| Active resume | `defaultResumeId` FK on CandidateProfile (simpler query pattern for Phase 3 matching — Guide 2.10 allows either mechanism) |

## 1. New Dependencies

```bash
pnpm -C backend add multer mammoth pdf-parse @anthropic-ai/sdk
```

- `multer` — multipart upload handling
- `mammoth` — DOCX text extraction
- `pdf-parse` — PDF text extraction
- `@anthropic-ai/sdk` — installed now, used when `AI_PROVIDER=anthropic`

## 2. Prerequisite (before Batch C)

🚩 **Real RabbitMQ round-trip has never been verified** (all Phase 1 messaging was mocked).
Before building the consumer: publish + consume one test message Windows → WSL2.
If unreachable, fixing WSL2 networking/firewall is step zero of Batch C.

## 3. Carried Conventions (from Phase 1)

- All entities extend `BaseEntity` (UUID v7 via `@BeforeInsert`)
- Every migration is registered explicitly in `data-source.ts`
- Zod at every untrusted boundary: HTTP bodies (`ZodBody`), RabbitMQ messages, AI output, parser output
- Swagger docs live in per-module `docs/*.swagger.ts` composed decorators
- Global `AuthenticationGuard` default-deny; `@Public()` only where needed
- Config via `ConfigService` only — new env vars go in `.env`, `.env.example`, `configuration.ts`, `env.validation.ts`
- New env groups this phase:

```env
# Storage
STORAGE_DRIVER=local
STORAGE_LOCAL_ROOT=./storage

# AI
AI_PROVIDER=stub
ANTHROPIC_API_KEY=

# Worker
WORKER_STANDALONE=false
```

## 4. Batch A — Candidate Profile Foundation

### A1. Entity + migration
- `backend/src/modules/candidate/entities/candidate-profile.entity.ts`
  Fields: id (UUIDv7), userId (unique FK), headline?, professionalSummary? (text),
  location?, phone?, linkedinUrl?, githubUrl?, portfolioUrl?, createdAt, updatedAt,
  defaultResumeId (nullable uuid FK to resumes — added in Batch E or now as nullable column)
- Migration added to `data-source.ts` explicitly

### A2. Registration transaction update
- `AuthService.register`: create User + blank CandidateProfile in ONE TypeORM transaction
  (transactional via DataSource.transaction)

### A3. Module + API
- `candidate.module.ts`, repository, service
- `GET /api/candidate/profile` — own profile (404 if somehow missing)
- `PATCH /api/candidate/profile` — partial update, Zod schema:
  all fields optional, strings maxed (headline 120, urls 500), phone basic charset check
- Swagger: `docs/candidate-profile.swagger.ts`
- Unit tests: service create-on-register linkage, patch normalization/trimming
- e2e: register → profile exists; patch updates; unauthenticated → 401

## 5. Batch B — Resumes Core (sync path)

### B1. Resume entity + migration
- `backend/src/modules/resumes/entities/resume.entity.ts`
  id, userId FK, fileName, mimeType, fileSize, storageKey, status enum
  (UPLOADED | PROCESSING | PROCESSED | FAILED), extractedText? (text),
  processingError? (text), timestamps

### B2. Storage abstraction
```
src/infrastructure/storage/
├── storage.module.ts        // provides selected driver by STORAGE_DRIVER
├── storage.service.ts       // put/get/delete(key) interface
└── providers/local-storage.provider.ts
```
- Keys never trusted from client; server builds `resumes/<userId>/<uuid>.<ext>`
- `storage/` root gitignored

### B3. Upload endpoint
- `POST /api/resumes` (multipart)
- Guard chain: auth → multer memoryStorage → validator pipe:
  size ≤ 10MB, mime ∈ {pdf, docx}, extension consistency
- Flow: validate → store via abstraction → INSERT resume (status UPLOADED)
  → publish `resume.processing.requested` {resumeId} → 201 return entity (no binary)
- Failure after store but before insert → best-effort delete file (orphan sweep note)
- Swagger + e2e (real small PDF fixture; >10MB rejected; wrong type rejected)

## 6. Batch C — Async Pipeline (needs §2 prerequisite ✅)

### C1. Messaging topology (constants module)
- Exchange: `jobpilot.events` (durable direct)
- Routing key / queue: `resume.processing.requested` → queue `jobs.resume-processing`
- Publisher already exists (Phase 1 MessagingService.publish)
- Message payload Zod schema shared by publisher + consumer (one source of truth):
  `{ resumeId: string(uuid) }`

### C2. Consumer inside main app
- `src/workers/resume-processing/resume-processing.consumer.ts`
  registered in ResumesModule; starts on init; ack on success, nack+requeue on transient error,
  dead-letter after N attempts (simple x-death count or retry header — keep minimal)
- `main.ts`: if `WORKER_STANDALONE=true` skip `app.listen(port)` after init

### C3. Text extraction
- Parser interface: `ResumeParser { supports(mime): boolean; extract(buffer): Promise<string> }`
- `PdfParser` (pdf-parse), `DocxParser` (mammoth); resolver picks by stored mimeType
- On success: status PROCESSING→(extract ok) save extractedText
- On failure: status FAILED + processingError message; NO publish to AI step

### C4. e2e/unit
- Consumer unit test with fake channel: valid msg → repo called; invalid payload (Zod fail) → ack+discard;
  missing resume → ack+discard (idempotency); parser throw → FAILED persisted
- Optional local integration run against real broker (manual smoke script)

## 7. Batch D — AI Structured Extraction

### D1. AI infrastructure
```
src/infrastructure/ai/
├── ai.module.ts
├── ai-client.interface.ts      // complete(system,user): Promise<string>
├── providers/stub-ai.client.ts // returns canned VALID json (configurable delay)
├── providers/anthropic-ai.client.ts // wired but only used when AI_PROVIDER=anthropic
└── ai.provider.factory.ts      // switch on AI_PROVIDER
```
- Stub returns realistic structured JSON so downstream is fully exercisable without key

### D2. Structured output contract (Zod)
- `resumes/schemas/structured-resume.schema.ts`:
  summary?, skills[{name, level?}], experience[{company,title,start,end?,bullets[]}],
  education[], certifications[], projects[]
- Strict: unknown keys stripped, empty allowed but types enforced
- THIS schema is the gate — invalid AI output ⇒ resume.status=FAILED, nothing persisted

### D3. Persistence of structure (relational per TRD)
Entities (all UUIDv7, FK to resume, explicit migrations):
- ResumeSkill(name, level?)
- ResumeExperience(company,title,startDate,endDate?,description?,achievements jsonb[])
- ResumeEducation(institution,degree,field?,startYear?,endYear?)
- ResumeProject(name,description?,technologies jsonb[])
- ResumeCertification(name,issuer?,issuedAt?)
- Write path: replace-all transaction per resume (delete children then insert validated set)

### D4. Pipeline completion rule
extract ok → send prompt(text)+system(contract description) → parse JSON → Zod safeParse
  ├─ pass → persist children + status=PROCESSED
  └─ fail → status=FAILED + processingError='ai_validation_failed'

## 8. Batch E — Review & Approval Loop

### E1. Endpoints (owner-checked on every route: session.user.id === resume.userId)
- `GET    /api/resumes/:id/parsed-data`   // assembled from child tables
- `PATCH  /api/resumes/:id/parsed-data`   // Zod partial of structured schema; replaces changed sections
- `POST   /api/resumes/:id/approve`       // sets approvedAt (new nullable column + migration)
- `GET    /api/resumes`                    // list mine (status filter)
- `DELETE /api/resumes/:id`                // delete file + row (and children cascade)

### E2. Active/default resume
- `PATCH /api/candidate/profile/default-resume` {resumeId|null}
- Validates ownership + resume exists; single source on CandidateProfile.defaultResumeId

## 9. Testing Strategy Summary

| Layer | What | How |
|---|---|---|
| Unit | services, parsers (fixture pdf/docx files in `test/fixtures/`), AI factory, schemas | mocked repos/storage/channel/AI |
| e2e | full HTTP surface incl. upload flow with STUB ai provider + real DB | supertest, Redis/Rabbit/AI mocked at boundaries |
| Manual smoke | real RabbitMQ consume loop, real anthropic call behind flag | documented commands in this file |

## 10. Definition of Done (gate to Phase 3)

- [ ] CandidateProfile auto-created on register; GET/PATCH works
- [ ] POST /resumes accepts PDF+DOCX ≤10MB; stores via abstraction; returns entity
- [ ] Processing async: API responds before extraction completes
- [ ] Real RabbitMQ publish→consume verified locally
- [ ] PDF and DOCX both extract text successfully
- [ ] AI output Zod-gated; invalid output never reaches DB (FAILED instead)
- [ ] User can view/edit parsed data; approve sets approvedAt
- [ ] Default resume selectable and owned-checked
- [ ] All new env vars present in .env.example + Joi schema
- [ ] lint/build/test/e2e green in CI
