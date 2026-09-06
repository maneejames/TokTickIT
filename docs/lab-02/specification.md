# Lab 2 Sprint Engineering Specification

## 1. Sprint Goal

Deliver the Requester-facing IT Ticketing MVP for TokTickIT with a consistent Zen Green Theme visual design. Provide end users (Requesters) the ability to create support tickets with attachments, view their submitted tickets with search, filtering, sorting, and pagination, inspect ticket details, and manage attachments under strict requester ownership. Multi-user context is simulated through a temporary Development Requester Selector while authentication is deferred to Lab 3.

---

## 2. Stakeholder Request Interpretation

The IT department requires a professional, responsive ticketing portal for end users (Requesters). Requesters must be able to classify their issue by Category and Related System, specify Requested Priority, provide a concise Summary and detailed Description, attach supporting files, and submit the ticket. 

Upon submission, the system generates a unique official Ticket Number and places the ticket in `New` status. Requesters can track their submitted tickets via the "My Tickets" screen with search, filtering, sorting, and pagination, open the Ticket Detail screen, inspect read-only ticket information, add new attachments, and soft-remove attachments with a reason. 

Because official authentication and role-based access control will be implemented in Lab 3, Lab 2 implements a temporary Development Requester Selection screen to simulate user sessions and enforce strict cross-requester data isolation. The application establishes the Zen Green Theme and reusable UI conventions (forms, lists, badges, validation, loading, empty, and error states) to be reused across future labs.

---

## 3. Scope

### Included
1. **Development Requester Selection ("Test Login")**:
   - Seeded active (≥4) and inactive (≥1) requesters.
   - Requester selection screen with loading, empty, and API error states.
   - Global requester context stored in client `localStorage` and displayed in the application shell header.
   - "Change Requester" action enabling rapid identity switching during testing.
   - Inactive requesters strictly excluded from the selection dropdown.
2. **Create Ticket Workflow**:
   - Form fields: Ticket Number (system-generated, read-only), Ticket Date (system-generated, read-only), Requester Name (from context, read-only), Category dropdown, Related System dropdown, Requested Priority dropdown, Summary, Description, and File Attachments.
   - File attachment constraints: max 5 active files per ticket, max 5 MB per file, allowed types: JPG/JPEG, PNG, WEBP, and PDF.
   - Two-step submission flow: `POST /api/tickets` creates the ticket (`Content-Type: application/json` only), followed by sequential calls to `POST /api/tickets/:id/attachments` for each selected file. If an attachment upload fails after ticket creation, the ticket is KEPT (not rolled back) and the UI displays a partial-success message (e.g. "Ticket TICK-... created. 1 of 2 attachments failed to upload — you can retry from Ticket Detail.").
   - Unique Ticket Number generation formatted as `TICK-YYYYMMDD-XXXX` in an atomic database transaction using a dedicated `TicketSequence` table.
   - Initial ticket status set to `New`.
   - UI feedback states: pristine, loading/submitting busy state, field-level validation errors, API failure with form inputs preserved, and creation success screen displaying the generated Ticket Number (or partial-success notice if attachment upload failed).
3. **My Tickets (Requester Ticket List)**:
   - Paginated list of tickets owned exclusively by the active Development Requester.
   - Search by Summary and Ticket Number (case-insensitive substring match).
   - Filtering by Category and Status.
   - Sorting by Date (Created At), Priority, Status, and Summary (ascending/descending).
   - Pagination controls (page number, page size, total count, total pages).
   - Responsive presentation: desktop table (≥992px) with active Attachments count column, and mobile card view (<768px).
   - Clear distinction between empty state (user has 0 tickets) and no-results state (search/filter returned 0 matches).
4. **Requester Ticket Detail & Attachment Management**:
   - Read-only display of ticket attributes (Ticket Number, Date, Status badge, Priority badge, Category, Related System, Summary, Description).
   - Strict backend ownership validation: returning safe rejection (404 Not Found to prevent user enumeration) if a user attempts to access a ticket owned by another requester.
   - Attachment lifecycle:
     - View active attachment metadata (filename, size, upload timestamp).
     - Download active attachment files safely via backend endpoint supporting `X-Requester-Id` header or `?requesterId=` query param.
     - Add new permitted attachments up to the 5 active attachments limit.
     - Soft-remove attachment with confirmation modal and optional removal reason (`removedReason`, max 200 chars), retained as metadata while download is strictly blocked with HTTP 410 Gone.
5. **Zen Green UI Design System**:
   - Implementation of specified color tokens, typography, button hierarchy, and form states.
   - Responsive behavior across Desktop (≥992px), Tablet (768–991px), and Mobile (<768px) viewports.

### Excluded
1. **Authentication and Security**: Real login, logout, passwords, password hashing, sessions, JWT/cookies, role-based authorization.
2. **IT Staff Workflow**: IT staff queue, ticket assignment/claiming, IT priority adjustments, internal notes, resolution tracking.
3. **Collaboration Features**: Public comments, requester-agent chat, email notifications.
4. **Lifecycle Transitions**: Changing status beyond `New` (no resolving, closing, cancelling, or reopening).
5. **Administration**: Admin screens for managing categories, related systems, or requester accounts.

---

## 4. Functional Requirements

- **FR-01 (Requester Selection)**: The application must provide a Development Requester Selection screen that lists all active Requesters retrieved from the database.
- **FR-02 (Requester Context)**: Upon selecting a Requester, the application must store the identity in `localStorage`, display the Requester's name in the navigation header, and provide a "Change Requester" button to switch identities.
- **FR-03 (Requester Re-validation)**: On application load, the stored Requester ID must be re-validated against active database records; if invalid or inactive, the user must be redirected to the Selection screen.
- **FR-04 (Reference Data Loading)**: The Create Ticket and My Tickets screens must fetch active Categories and Related Systems from the backend API.
- **FR-05 (Create Ticket Form)**: The system must allow the user to submit a ticket with Category, Related System, Requested Priority, Summary, Description, and optional initial Attachments (uploaded sequentially after ticket creation).
- **FR-06 (Ticket Number Generation)**: The backend must generate a unique, sequential official Ticket Number formatted as `TICK-YYYYMMDD-XXXX` upon ticket creation.
- **FR-07 (Initial Ticket Status)**: Every newly created ticket must automatically be assigned the status `New`.
- **FR-08 (Form Validation & Feedback)**: The frontend and backend must validate all required fields and length constraints, displaying field-level error messages directly below invalid controls.
- **FR-09 (Submission Failure Resilience)**: If ticket creation fails due to a network or server error, the form must remain populated with the user's entered data.
- **FR-10 (My Tickets Listing)**: The system must retrieve and display a paginated list of tickets owned by the active Requester.
- **FR-11 (Search & Filtering)**: The My Tickets screen must allow searching across summary/ticket number and filtering by category and status.
- **FR-12 (Sorting & Pagination)**: The My Tickets screen must support sorting by creation date, priority, status, and summary, and allow navigation across pages with configurable page sizes.
- **FR-13 (Ownership Isolation)**: The backend must strictly restrict ticket retrieval, detail viewing, and attachment operations to the owner requester specified in the `X-Requester-Id` header.
- **FR-14 (Ticket Detail View)**: The system must display a read-only Ticket Detail view containing all ticket header attributes, summary, description, and attachments.
- **FR-15 (Attachment Upload Limit)**: A ticket must not have more than 5 active (non-removed) attachments at any time.
- **FR-16 (Attachment Type & Size Enforcement)**: The system must reject attachments that exceed 5 MB or whose MIME types are not JPEG, PNG, WEBP, or PDF.
- **FR-17 (Attachment Download)**: The system must provide a secure download endpoint for active attachments owned by the requester.
- **FR-18 (Attachment Soft-Removal)**: The system must allow the requester to soft-remove an attachment with an optional reason, marking it as removed and preventing future downloads while preserving metadata.

---

## 5. Business Rules

| Rule ID | Business Rule Statement |
|---|---|
| **BR-01** | The official Ticket Number is generated by the backend, formatted as `TICK-YYYYMMDD-XXXX` (where `YYYYMMDD` is the server date and `XXXX` is a 4-digit zero-padded daily sequence starting at `0001`). Sequence generation must be atomic inside a transaction using a dedicated `TicketSequence` table (`date` unique, `lastNumber`), updated via `SELECT ... FOR UPDATE`. Native Postgres sequences are not used. |
| **BR-02** | A new Ticket begins with Current Status `New`. Initial creation never sets any other status. |
| **BR-03** | Lab 2 uses a Development Requester selector instead of login. The selected identity is for testing only and does not constitute secure authentication. |
| **BR-04** | Inactive Requesters (`isActive: false`) must never appear in the Development Requester selector and cannot be used to create or view tickets (attempted use returns HTTP 403 Forbidden). Any protected route accessed without the required `X-Requester-Id` header (or without `?requesterId=` query param on attachment download) returns HTTP 401 Unauthorized. |
| **BR-05** | The selected Development Requester ID persists in browser `localStorage` across refreshes, but must be re-validated against active backend Requesters on initial app load. If invalid or inactive, the user is redirected to the Selection screen. |
| **BR-06** | Ticket ownership is strictly enforced: Requester A can never view, search, open, or download tickets or attachments belonging to Requester B. Any unauthorized access returns HTTP 404 Not Found to prevent user enumeration. |
| **BR-07** | Summary and Description must be trimmed of leading and trailing whitespace before validation. Summary must be 5–100 characters; Description must be 10–2000 characters. |
| **BR-08** | Permitted Requested Priority values are `LOW`, `MEDIUM`, and `HIGH`. The default value is `MEDIUM`. |
| **BR-09** | Permitted attachment MIME types are `image/jpeg`, `image/png`, `image/webp`, and `application/pdf`. Max file size is 5 MB (5,242,880 bytes). |
| **BR-10** | A ticket may have at most 5 active (non-removed) attachments simultaneously. Soft-removed attachments do not count towards this 5-file active limit. |
| **BR-11** | Attachment files are stored on disk under `server/uploads/attachments/` using randomly generated UUIDs (`{uuid}.{ext}`). Original filenames are stored solely as display metadata to prevent path traversal and collisions. Soft-removed files remain in place on disk, relying on `isRemoved: true` in the database. |
| **BR-12** | Attachment removal must be implemented as soft removal (`isRemoved = true`, recording `removedAt` and optional `removedReason`). Soft-removed attachments remain listed in metadata but cannot be downloaded, previewed, or restored by the requester. Downloading a soft-removed attachment returns HTTP 410 Gone. |
| **BR-13** | Removing an attachment requires an explicit confirmation modal. An optional free-text removal reason (`removedReason`, max 200 characters) may be provided and saved. |
| **BR-14** | Submit actions must prevent duplicate submissions: the submission button enters a disabled busy state during request processing. Upon API failure, the user's entered form data must be preserved. |
| **BR-15** | My Tickets must distinguish between an "Empty State" (requester has never submitted any tickets) and a "No Results State" (requester has submitted tickets, but current search/filter criteria matched zero items). |

---

## 6. UI Specification Summary

The user interface strictly adheres to the **Zen Green Theme** specified in `docs/lab-02/ui-spec.md`:
- **Core Tokens**: Primary Green (`#006B3C`), Secondary Green (`#0B7A46`), Pale Green (`#EAF6EF`), Background (`#F5F7F6`), Surface (`#FFFFFF`), Text Charcoal-Green (`#1A2E22`), Error (`#B3261E`), Warning (`#B58105`).
- **Application Shell**: Displays TokTickIT branding, primary navigation links ("My Tickets", "Create Ticket"), and active Requester badge with a "Change Requester" action.
- **Screen 1 (Requester Selector)**: Centered card layout with introductory testing banner, active requester dropdown, "Continue" button, and error/empty feedback.
- **Screen 2 (Create Ticket)**: Structured form with read-only Requester and Date fields, required classification dropdowns (Category, Related System), Priority radio/dropdown, Summary input, multiline Description, Attachment dropzone/input, and bottom action bar.
- **Screen 3 (My Tickets)**: Desktop responsive table with columns (Ticket #, Summary, Category, Priority badge, Status badge, Created Date, Actions) and mobile stacked card view (<768px), filter toolbar, search bar, and pagination controls.
- **Screen 4 (Ticket Detail)**: Read-only header card, classification summary, full description, and dedicated Attachments Section with active list (download, remove actions), upload dropzone (if active count < 5), and soft-removed audit list.

---

## 7. Data Changes (Prisma Schema Increment)

The database schema is defined in PostgreSQL using Prisma ORM:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Priority {
  LOW
  MEDIUM
  HIGH
}

enum TicketStatus {
  NEW
}

model RequesterUser {
  id         Int      @id @default(autoincrement())
  name       String
  email      String   @unique
  department String
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  tickets    Ticket[]

  @@map("requester_users")
}

model Category {
  id        Int      @id @default(autoincrement())
  name      String   @unique
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  tickets   Ticket[]

  @@map("categories")
}

model RelatedSystem {
  id          Int      @id @default(autoincrement())
  name        String   @unique
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  tickets     Ticket[]

  @@map("related_systems")
}

model Ticket {
  id                Int          @id @default(autoincrement())
  ticketNumber      String       @unique
  requesterId       Int
  categoryId        Int
  relatedSystemId   Int
  summary           String       @db.VarChar(100)
  description       String       @db.VarChar(2000)
  requestedPriority Priority     @default(MEDIUM)
  currentStatus     TicketStatus @default(NEW)
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  requester     RequesterUser @relation(fields: [requesterId], references: [id])
  category      Category      @relation(fields: [categoryId], references: [id])
  relatedSystem RelatedSystem @relation(fields: [relatedSystemId], references: [id])
  attachments   Attachment[]

  @@index([requesterId, createdAt(sort: Desc)])
  @@index([currentStatus])
  @@map("tickets")
}

model Attachment {
  id               Int       @id @default(autoincrement())
  ticketId         Int
  storedFilename   String    @unique
  originalFilename String
  mimeType         String
  sizeBytes        Int
  isRemoved        Boolean   @default(false)
  removedAt        DateTime?
  removedReason    String?   @db.VarChar(200)
  uploadedAt       DateTime  @default(now())

  ticket Ticket @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  @@index([ticketId, isRemoved])
  @@map("attachments")
}

model TicketSequence {
  id         Int      @id @default(autoincrement())
  date       String   @unique @db.VarChar(8)
  lastNumber Int      @default(0)
  updatedAt  DateTime @updatedAt

  @@map("ticket_sequences")
}
```

### Seed Data Requirements
1. **Categories (4)**: Account and Access, Hardware, Software, Network.
2. **Related Systems (≥6)**: Email, Campus Wi-Fi, VPN, LEB2 App, Grade Submission App, Printer, Corporate Laptop.
3. **Requesters**:
   - Active (≥4):
     - Somchai Jaidee (`somchai.jai@kmutt.ac.th`, Engineering)
     - Suda Rakdee (`suda.rak@kmutt.ac.th`, Science)
     - John Doe (`john.doe@kmutt.ac.th`, Information Technology)
     - Jane Smith (`jane.smith@kmutt.ac.th`, Digital Arts)
   - Inactive (≥1):
     - Anon Olduser (`anon.old@kmutt.ac.th`, Former Staff, `isActive: false`)

---

## 8. API Contract Summary

All endpoints require the `X-Requester-Id` header for requester-specific operations. Detailed schemas and query parameters are documented in `docs/lab-02/api-spec.md`.

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `GET` | `/api/requesters` | List active development requesters | 200, 500 |
| `GET` | `/api/categories` | List active ticket categories (`isActive: true`) | 200, 500 |
| `GET` | `/api/related-systems` | List active related IT systems (`isActive: true`) | 200, 500 |
| `POST` | `/api/tickets` | Create ticket with initial fields (JSON body) | 201, 400, 500 |
| `GET` | `/api/tickets` | List paginated tickets owned by requester | 200, 400, 401, 500 |
| `GET` | `/api/tickets/:id` | Get single ticket detail owned by requester | 200, 404, 500 |
| `POST` | `/api/tickets/:id/attachments` | Add attachment to existing ticket | 201, 400, 404, 413, 415, 500 |
| `GET` | `/api/tickets/:id/attachments/:attachmentId/download` | Download active attachment file (`X-Requester-Id` or `?requesterId=`) | 200, 404, 410, 500 |
| `PATCH` | `/api/tickets/:id/attachments/:attachmentId/remove` | Soft-remove attachment with `removedReason` | 200, 400, 404, 500 |

---

## 9. Acceptance Criteria (Given-When-Then)

### Requester Context & Shell
- **AC-01**: Given active and inactive requesters in the database, when the Development Requester Selection screen is rendered, then only active requesters appear in the dropdown.
- **AC-02**: Given an active requester is selected and "Continue" clicked, when navigating into the application, then the application shell displays the selected Requester's name and department.
- **AC-03**: Given a selected requester in `localStorage`, when the user clicks "Change Requester", then the user is returned to the selection screen and may choose a different identity.
- **AC-04**: Given an invalid or inactive requester ID stored in `localStorage`, when the application loads, then it clears the storage and redirects to the Requester Selection screen.

### Ticket Creation
- **AC-05**: Given valid input values (Category, Related System, Priority, Summary of 5-100 chars, Description of 10-2000 chars), when the requester submits the form, then a ticket is created with status `New`, an official Ticket Number `TICK-YYYYMMDD-XXXX` is generated via atomic transaction, and a success confirmation is displayed. If initial attachments were selected, they are uploaded sequentially; if an attachment upload fails, the ticket is kept and a partial-success alert is shown.
- **AC-06**: Given a Summary with leading/trailing spaces, when submitted, then the system trims the spaces and validates that the trimmed length is between 5 and 100 characters.
- **AC-07**: Given missing required fields or input shorter than minimum lengths, when the user clicks Submit, then field-level error messages are displayed below each invalid field, and no API request is dispatched.
- **AC-08**: Given an attachment file exceeding 5 MB or of unsupported MIME type (e.g. `.exe` or `.zip`), when attached, then an immediate validation error is displayed, and upload is rejected.
- **AC-09**: Given the backend is unreachable or returns a 500 error, when the user submits a ticket, then a clear error callout is displayed, and all previously entered form values remain intact.
- **AC-10**: Given the user clicks Submit, then the button enters a busy state with a spinner, and duplicate clicks are prevented.

### My Tickets
- **AC-11**: Given Requester A has created 3 tickets, when Requester A views My Tickets, then all 3 tickets appear in the list with Ticket Number, Summary, Category, Priority badge, Status badge, Attachments count, and Created Date.
- **AC-12**: Given Requester A has tickets and Requester B has 0 tickets, when switching to Requester B, then Requester B sees an empty state message and zero of Requester A's tickets.
- **AC-13**: Given 15 tickets owned by Requester A and page size set to 10, when viewing page 1, then 10 tickets are shown with pagination indicators for Page 1 of 2.
- **AC-14**: Given search text "Wi-Fi" or a ticket number substring (e.g. "0001"), when entered into the search box, then only tickets containing the substring in Summary or Ticket Number (`ILIKE '%search%'`) are returned.
- **AC-15**: Given a search query with no matches, when submitted, then a "No matching tickets found" message is displayed with a "Clear Filters" option.
- **AC-16**: Given sorting by Date, Priority, Status, or Summary, when selected, then tickets are ordered accordingly.

### Ticket Detail & Attachments
- **AC-17**: Given a ticket owned by Requester A, when Requester A navigates to `/tickets/:id`, then all ticket details are rendered in read-only format.
- **AC-18**: Given Requester B attempts to open `/tickets/:id` belonging to Requester A, then the backend rejects the request with HTTP 404 Not Found, and the UI shows a not found / unauthorized access message.
- **AC-19**: Given a ticket with fewer than 5 active attachments, when the owner uploads a valid file (e.g. PNG under 5 MB), then the file is saved on disk, recorded in the database, and rendered in the active attachment list.
- **AC-20**: Given a ticket with 5 active attachments, when viewing the attachment section, then the upload dropzone is hidden or disabled with a message indicating the 5-file limit is reached.
- **AC-21**: Given an active attachment, when the requester clicks "Download", then the browser initiates the download of the binary file with its original filename (using `?requesterId=` query parameter).
- **AC-22**: Given an active attachment, when the requester clicks "Remove", then a confirmation modal appears prompting for an optional removal reason (`removedReason`).
- **AC-23**: Given the requester confirms removal with reason "Uploaded wrong screenshot", then the attachment is marked soft-removed, removed from the active list, displayed under the removed list with its metadata and reason, and its download button is removed/disabled.
- **AC-24**: Given a direct HTTP GET request to download a soft-removed attachment ID, then the backend rejects the request with HTTP 410 Gone.

### Responsive & Accessibility
- **AC-25**: Given a mobile viewport (<768px), when viewing My Tickets, then tickets are presented as vertical cards with stacked metadata without horizontal scrolling.
- **AC-26**: Given keyboard navigation, when using the Tab key, then all interactive controls have visible focus rings matching the Zen Green palette (`#0B7A46`).

---

## 10. Definition of Done (Product DoD)

A feature or issue is considered **Done** only when all of the following conditions are met:
1. **Code Completeness**: All approved functional requirements and business rules for the issue are fully implemented.
2. **Acceptance Criteria Verification**: Every mapped Acceptance Criterion is verified with passing automated test evidence.
3. **Automated Tests**:
   - Unit and API integration tests pass with 100% success rate (`npm test`).
   - UI component tests pass with React Testing Library.
   - Zero tests are skipped, commented out, or disabled.
4. **Architecture & Design**:
   - Conforms strictly to the API Contract in `docs/lab-02/api-spec.md`.
   - Conforms strictly to the Zen Green visual tokens and responsive rules in `docs/lab-02/ui-spec.md`.
5. **Robustness & Edge Cases**:
   - All validation errors, boundaries, loading states, empty states, and API failure modes are handled gracefully without application crashes.
   - Cross-requester security checks are verified with automated boundary tests.
6. **Documentation & Traceability**:
   - The test plan in `docs/lab-02/tests.md` is updated with actual test file paths and passing results.
   - Visual inspection evidence is captured under `artifacts/lab-02/screenshots/`.

---

## 11. Assumptions and Decisions

1. **Ticket Number Format (`TICK-YYYYMMDD-XXXX`)**:
   - *Decision*: Daily sequence counter starting at `0001` each day, formatted as `TICK-YYYYMMDD-XXXX`. Handled via a dedicated `TicketSequence` table with columns `date` (unique) and `lastNumber`, locked and incremented atomically via `SELECT ... FOR UPDATE` inside the ticket creation transaction (not a native Postgres sequence).
   - *Justification*: Prevents guessing total ticket counts while providing intuitive human-readable dates for IT helpdesk sorting. Atomic row lock prevents sequence collisions or gaps under concurrent submissions.
2. **Summary & Description Limits**:
   - *Decision*: Summary: min 5, max 100 characters; Description: min 10, max 2000 characters.
   - *Justification*: Summary must be concise enough for table/card listings without truncation. Description must provide sufficient detail for IT troubleshooting while preventing database bloat. Trimming leading/trailing whitespace prevents whitespace-only bypasses.
3. **Requested Priority Tiers (3 Tiers)**:
   - *Decision*: `LOW`, `MEDIUM`, `HIGH` (default: `MEDIUM`).
   - *Justification*: Directly matches the UI mockups and badge styles shown in Figure 1 and Section 7 of the course handout. Omits `URGENT` to maintain exact alignment with the rubric's visual checklist.
4. **Attachment Storage Strategy & Two-Step Creation**:
   - *Decision*: Files stored on the local server filesystem under `server/uploads/attachments/` named with UUID v4 (`{uuid}.{ext}`). Files are retained in place even when soft-removed. During ticket creation, `POST /api/tickets` creates the ticket record first (`application/json`), followed by sequential `POST /api/tickets/:id/attachments` uploads. If an attachment upload fails, the ticket is kept (not rolled back) and a partial-success alert is shown. Downloads are authorized by ownership, accepting either `X-Requester-Id` header or `?requesterId=` query parameter (enabling plain `<a href>` downloads).
   - *Justification*: Prevents directory traversal vulnerabilities, disk overwrite collisions, and keeps PostgreSQL lean. Plain link download support solves browser header limitations.
5. **Soft-Removal Flow**:
   - *Decision*: Confirmation modal is mandatory; removal reason (`removedReason`) is optional (max 200 characters). Soft-removed attachments return HTTP 410 Gone if direct download is attempted. Attempting to soft-remove an already-removed attachment returns HTTP 400 Bad Request with code `ALREADY_REMOVED` ("Attachment is already removed").
   - *Justification*: Handout Section 4.5 requires defining confirmation and reason rules. HTTP 410 Gone unambiguously indicates that the resource formerly existed but has been intentionally removed. Returning 400 Bad Request on double-removal prevents duplicate or conflicting audit timestamps while preserving the original removal record.
6. **Requester Context Persistence**:
   - *Decision*: Store `selectedRequesterId` in browser `localStorage`, re-validated against `GET /api/requesters` upon initial application load.
   - *Justification*: Retains test identity during browser page reloads and refreshes. If the database is reseeded or the requester is deactivated, the app gracefully falls back to the selector.
7. **Requester Department Field (`department`)**:
   - *Decision*: Added `department String` to `RequesterUser` model and API response.
   - *Justification*: Required to display user affiliation in the Application Shell context pill (`👤 [Requester Name] ([Department])`) and selection dropdown per `ui-spec.md` Sections 3/4.1 and AC-02.
