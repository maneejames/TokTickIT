# Lab 2 Zen Green UI Specification

## 1. Visual Identity & Design Tokens

TokTickIT adopts the **Zen Green Theme**, establishing a calm, clean, professional enterprise appearance. These tokens must be consistently reused across all screens and components.

### 1.1 Color Tokens

| Token Name | Hex Code | Purpose / Intended Use |
|---|---|---|
| `--color-primary-green` | `#006B3C` | Application header, primary buttons, strong headers, and brand accents. |
| `--color-secondary-green` | `#0B7A46` | Hover states, active tab underline, focus outlines, and link text. |
| `--color-pale-green` | `#EAF6EF` | Selected rows, subtle callout backgrounds, success badges, and container highlights. |
| `--color-page-bg` | `#F5F7F6` | Main page background (quiet, near-white neutral). |
| `--color-surface` | `#FFFFFF` | Cards, panels, modal windows, table surfaces, and dropdown menus. |
| `--color-border` | `#D1DDD5` | Standard field borders, divider lines, and card containers. |
| `--color-text-main` | `#1A2E22` | Dark charcoal-green for body copy, primary headings, and high-contrast readability. |
| `--color-text-muted` | `#5A6B60` | Secondary labels, timestamps, file sizes, and placeholder text. |
| `--color-field-readonly` | `#EFF3F0` | Soft gray-green shading for read-only and system-generated inputs. |
| `--color-error` | `#B3261E` | Dark red for validation error text, error borders, and destructive confirmation modals. |
| `--color-error-bg` | `#FDF2F2` | Background tint for error callouts and invalid input highlights. |
| `--color-warning` | `#B58105` | Amber for High priority badges and caution callouts. |
| `--color-warning-bg` | `#FEF8E8` | Light amber background for warning notices. |

---

### 1.2 Typography

- **Font Family**: System UI stack: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.
- **Scale**:
  - `Display / H1`: 24px (1.5rem), font-weight: 700, line-height: 1.25.
  - `Section / H2`: 18px (1.125rem), font-weight: 600, line-height: 1.35.
  - `Subhead / H3`: 16px (1rem), font-weight: 600, line-height: 1.4.
  - `Body / Base`: 14px (0.875rem), font-weight: 400, line-height: 1.5.
  - `Small / Metadata`: 12px (0.75rem), font-weight: 400, line-height: 1.4.

---

### 1.3 Spacing Grid (8pt System)

- `space-1`: 4px
- `space-2`: 8px
- `space-3`: 12px
- `space-4`: 16px
- `space-6`: 24px
- `space-8`: 32px
- `space-12`: 48px

---

## 2. Component States & Form Controls

### 2.1 Form Controls
- **Label Placement**: Labels are always positioned **above** the input control (`font-weight: 600`, `font-size: 14px`, `margin-bottom: 4px`).
- **Required Indicator**: Required fields feature a red asterisk (`*`) immediately following the label text.
- **Editable Inputs**: White background (`#FFFFFF`), neutral border (`#D1DDD5`), 8px border-radius, minimum touch height of 40px.
- **Read-Only / System Fields**: Shaded background (`#EFF3F0`), border (`#D1DDD5`), cursor: default, clear visual distinction from editable controls without reducing readability.
- **Focused State**: Border shifts to `--color-secondary-green` (`#0B7A46`) with a 2px outer outline glow (`box-shadow: 0 0 0 3px rgba(11, 122, 70, 0.2)`).
- **Invalid State**: Border shifts to `--color-error` (`#B3261E`).
- **Validation Message**: Rendered immediately below the invalid field in red text (`font-size: 12px`, `margin-top: 4px`). Never displayed solely at the top of the page.

---

### 2.2 Button Hierarchy

| Button Role | Visual Style | Hover / Active State | Use Case |
|---|---|---|---|
| **Primary** | Solid `#006B3C` background, white text, bold font. | `#0B7A46` background, subtle elevation shadow. | Form submit, "Continue", "Create Ticket" action. |
| **Secondary** | White background, `#006B3C` border (1.5px), `#006B3C` text. | `#EAF6EF` background tint. | "Change Requester", "Cancel", "Clear Filters". |
| **Tertiary / Link** | Transparent background, `#0B7A46` text, underline on hover. | Darker green text underline. | Table row "View Details", pagination numbers. |
| **Destructive** | White or pale red background, `#B3261E` border/text. | `#B3261E` background, white text. | "Remove Attachment" trigger. |
| **Disabled** | `#E0E0E0` background, `#888888` text, cursor: not-allowed. | No visual change on hover. | Submit button before valid form or when active attachments reach 5. |
| **Busy / Loading** | Primary button styling with embedded animated spinner, disabled interaction. | Spinner continues rotating, text replaced by "Submitting...". | Processing API requests to prevent double-clicks. |

---

### 2.3 Badges

#### Status Badges
- **`New`**: Background `#EAF6EF`, Text `#006B3C`, Border `1px solid #B8E2CB`, border-radius 12px, padding `2px 8px`, `font-size: 12px`, `font-weight: 600`.

#### Priority Badges
- **`LOW`**: Background `#F0F4F2`, Text `#375043`, Border `1px solid #D1DDD5`.
- **`MEDIUM`**: Background `#FEF8E8`, Text `#8F6500`, Border `1px solid #F5DE9C`.
- **`HIGH`**: Background `#FDF2F2`, Text `#B3261E`, Border `1px solid #F8B4B4`.

---

## 3. Application Shell & Navigation

- **Top Navigation Bar**:
  - Background: `--color-primary-green` (`#006B3C`), height: 60px.
  - Left: **TokTickIT** logo and title in bold white text.
  - Center/Nav Links: "My Tickets" and "Create Ticket" links. Active page indicated by white bottom underline (3px) and font-weight 600.
  - Right: Development Requester Context Pill:
    - Displays: "👤 [Requester Name] ([Department])"
    - "Change Requester" button (compact white pill or outlined button).
- **Sub-banner (Testing Mode Notice)**:
  - Background: `#FEF8E8`, text `#6C4E00`, border-bottom `1px solid #E5CE85`.
  - Notice text: *"🧪 Lab 2 Testing Mode: Authenticated sessions will be introduced in Lab 3. Use the 'Change Requester' button to switch user context."*

---

## 4. Screen Layouts

### 4.1 Screen 1: Development Requester Selection Screen
- **Route**: `/select-requester` (or modal if unauthenticated)
- **Container**: Centered card (`max-width: 480px`, margin top 60px), surface white with soft shadow.
- **Card Content**:
  1. Title: "Welcome to TokTickIT" (`#006B3C`, 22px).
  2. Testing Banner: Pale amber callout explaining this simulates login for Lab 2.
  3. Form Control: "Select Development Requester *" dropdown.
     - Option label: `[Name] — [Department] ([Email])`.
     - Inactive users are excluded.
  4. Actions: "Continue to Portal" primary button.
  5. States:
     - **Loading**: Spinner while `GET /api/requesters` is in-flight.
     - **Empty**: Amber message if 0 active requesters exist.
     - **API Error**: Red callout with "Retry" button if backend is offline.

---

### 4.2 Screen 2: Create Ticket Screen
- **Route**: `/tickets/new`
- **Layout**: Centered card (`max-width: 760px`), padded 32px.
- **Sections**:
  1. **Header**: "Create IT Support Ticket" (H1, 22px).
  2. **System & Requester Context Row (2 columns on desktop)**:
     - Field: "Ticket Number" (Read-only, placeholder: *"Generated upon submission"*).
     - Field: "Requester" (Read-only, filled from context: *"Somchai Jaidee (Engineering)"*).
  3. **Classification Row (2 columns on desktop)**:
     - Field: "Category *" (Dropdown of active categories).
     - Field: "Related System *" (Dropdown of active systems).
  4. **Priority Row**:
     - Field: "Requested Priority *" (3 options: Low, Medium, High; default: Medium).
  5. **Problem Details**:
     - Field: "Ticket Summary *" (Input text, 5–100 chars after trimming, placeholder: *"Brief description of the problem"*). Counter indicates character count.
     - Field: "Problem Description *" (Textarea, 5 rows, 10–2000 chars after trimming, placeholder: *"Detailed explanation of steps to reproduce..."*). Counter indicates character count.
  6. **Attachments Section**:
     - File dropzone / file picker supporting multiple files.
     - Helper text: *"Allowed formats: JPG, PNG, WEBP, PDF. Max 5 MB per file. Up to 5 attachments total."*
     - Immediate inline validation error displayed below dropzone if any file exceeds 5 MB or has an unsupported MIME type.
     - File staging list showing staged files with size and "Remove" button.
     - Submission flow: Two-step flow. Ticket is created first via `POST /api/tickets` (JSON), followed by sequential uploads to `POST /api/tickets/:id/attachments`.
  7. **Footer Actions**:
     - "Submit Ticket" (Primary button). Enters busy spinner state on click.
     - "Cancel" (Secondary button, routes back to `/tickets`).
  8. **Submission Success / Partial-Success Screen**:
     - Pale green banner with green checkmark.
     - Displays official generated Ticket Number (e.g. `TICK-20260906-0001`) in bold 20px font.
     - **Partial-Success Handling**: If any staged attachment fails to upload after ticket creation, the ticket is KEPT (not rolled back) and an amber warning alert is displayed: *"Ticket TICK-... created. N of M attachments failed to upload — you can retry from Ticket Detail."*
     - Actions: "View Ticket Details" and "Create Another Ticket".

---

### 4.3 Screen 3: My Tickets Screen
- **Route**: `/tickets`
- **Layout**: Full container (`max-width: 1140px`).
- **Toolbar**:
  - Left: Search box (text input with search icon, placeholder: *"Search by summary or ticket #..."*).
  - Center: Category filter dropdown, Priority filter dropdown (All Priorities, Low, Medium, High), Status filter dropdown.
  - Right: "Create Ticket" primary button (`+ New Ticket`).
- **Desktop Table View (≥992px)**:
  - Columns:
    1. `Ticket #` (monospace font, link to detail).
    2. `Summary` (truncated with ellipsis if > 40 chars).
    3. `Category` (plain text).
    4. `Priority` (colored badge).
    5. `Status` (`New` badge).
    6. `Attachments` (count of active attachments, e.g. `📎 2`).
    7. `Date Created` (formatted `DD/MM/YYYY HH:mm`).
    8. `Action` ("View" button).
  - Hover: Row background shifts to `#F5F7F6`.
- **Mobile Card View (<768px)**:
  - Replaces table with stacked cards.
  - Card Header: Ticket # and Status badge.
  - Card Body: Summary (bold), Category and Priority badge on one line.
  - Card Footer: Date Created, Attachments count (`📎 2`), and full-width "View Details" button.
- **Pagination Bar**:
  - Displays: "Showing 1 to 10 of 24 tickets".
  - Page controls: Previous, Page Number buttons, Next.
- **Special States**:
  - **Empty State**: Illustrated icon, text *"You haven't submitted any tickets yet."*, with a prominent "Create Ticket" button.
  - **No Results State**: Text *"No tickets match your search criteria."*, with a "Clear Filters" button.

---

### 4.4 Screen 4: Requester Ticket Detail Screen
- **Route**: `/tickets/:id`
- **Layout**: Centered card (`max-width: 860px`).
- **Sections**:
  1. **Header**:
     - Ticket Number (bold 22px) + Status Badge (`New`) + Priority Badge (`High`).
     - "Back to My Tickets" link.
  2. **Meta Grid (2 columns on desktop)**:
     - Requester: Name & Department.
     - Created At & Updated At timestamps.
     - Category & Related System.
  3. **Summary & Description**:
     - Summary displayed in bold 16px text.
     - Full Description in shaded read-only box with preserved line breaks.
  4. **Attachments Section**:
     - **Active Attachments List**:
       - Table/cards listing active files with original filename, file type icon, size in KB/MB, and upload timestamp.
       - Actions: "Download" button (plain `<a href="/api/tickets/:id/attachments/:attachmentId/download?requesterId=[id]" download>` initiating direct file download) and "Remove" destructive button.
     - **Add Attachment Dropzone**:
       - Visible only if active attachments count < 5.
       - Disabled or replaced with callout *"Maximum 5 active attachments reached"* if active count is 5.
     - **Removed Attachments List (Audit Section)**:
       - Displays soft-removed files: Filename (strikethrough), removal date, and removal reason callout.
       - "Download Disabled" indicator.
  5. **Removal Confirmation Modal**:
     - Title: "Remove Attachment".
     - Warning: *"Are you sure you want to remove '[filename]'? This file will no longer be downloadable."*
     - Optional input: "Reason for removal (`removedReason`, optional, max 200 chars)".
     - Actions: "Confirm Removal" (Destructive red button) and "Cancel" (Secondary button).

---

## 5. Responsive Behavior

| Viewport | Breakpoint Range | Layout Adaptations |
|---|---|---|
| **Desktop** | `≥ 992px` | Multi-column grid for forms and meta details. My Tickets displays as full 8-column table. Center-aligned with max-width container. |
| **Tablet** | `768px – 991px` | Two-column form layouts adapt gracefully. Summary and Description retain full container width. My Tickets table enables horizontal scroll or condensed columns. |
| **Mobile** | `< 768px` | All multi-column grids collapse to single-column stacked layout. My Tickets table transitions into responsive touch-friendly cards. Form buttons span full width. Top navigation collapses or stacks neatly. Zero horizontal page scrolling. |

---

## 6. Accessibility & Usability Rules

1. **Keyboard Focus Rings**: Every button, input, select, link, and modal trigger displays an outline ring (`#0B7A46`, 2px solid with 2px offset) when focused via keyboard.
2. **Accessible Labels**: Every input element has a `<label>` linked via `htmlFor` and `id`. Icon-only buttons include `aria-label` and visual tooltips.
3. **Non-Color Reliance**: Status and priority badges combine color with explicit text labels. Error fields combine red borders with explicit error text and error icons.
4. **Dialog Trapping**: Modals trap keyboard focus and support closing via the Escape key or clicking the backdrop.

---

## 7. Visual Inspection Checklist & Screenshot Paths

All visual evidence required for Lab 2 submission must be saved under:
```
artifacts/lab-02/screenshots/
├── create-ticket/
│   ├── initial-desktop.png
│   ├── validation-errors.png
│   ├── submitting-busy.png
│   ├── success-ticket-number.png
│   ├── invalid-attachment.png
│   └── api-failure-preserved.png
├── my-tickets/
│   ├── requester-a-list.png
│   ├── requester-b-empty.png
│   ├── search-filtered.png
│   ├── no-results.png
│   ├── desktop-table.png
│   └── mobile-cards.png
├── ticket-detail/
│   ├── ticket-detail-view.png
│   ├── add-attachment.png
│   ├── download-active.png
│   ├── removal-modal.png
│   ├── soft-removed-state.png
│   └── cross-requester-denied.png
└── responsive/
    ├── create-ticket-mobile.png
    ├── create-ticket-tablet.png
    ├── my-tickets-mobile.png
    └── ticket-detail-mobile.png
```
