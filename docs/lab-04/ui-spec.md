# TokTickIT — Sprint 4 UI Specification

`docs/lab-04/ui-spec.md`

Extends the Zen Green design language from Labs 2–3 (tokens, cards, badges, buttons, forms, tables, loading/empty/error patterns). No new visual system is introduced. API shapes referenced here are defined in `api-spec.md`.

---

## 1. Navigation and Application Shell

| Role | Header links (in order) | Default landing |
|---|---|---|
| Requester | Dashboard · My Tickets · Create Ticket | Dashboard |
| IT Staff | Dashboard · Ticket Queue | Dashboard |
| Administrator | Dashboard · Ticket Queue · User Management | Dashboard |

- The active page is shown with an underline **and** `aria-current="page"` (non-color cue).
- Route guards from Lab 3 remain: unauthenticated → `/login`, `mustChangePassword` → `/change-password`, wrong role → the Forbidden screen.
- Header continues to show the authenticated user's name and role badge, plus Logout.

## 2. IT Staff Dashboard (`/dashboard`, IT Staff and Administrator)

Data: `GET /api/dashboard/staff`.

**Layout (desktop ≥ 992px)**
1. Page header: "Welcome back, {first name}" + subtitle + **Refresh** button (re-fetches, shows busy state).
2. **Metric card row** (5 cards): New · Open · In Progress · Waiting for Requester · My Owned.
3. **Attention row** (3 compact cards): Unassigned · Urgent (IT Priority) · Requester Resolved — awaiting your verification.
4. **Two-column lists**: left = "Urgent Tickets" and "Recently Updated" (tabs, max 5 rows each); right = "My Recent Actions Taken" (max 5) and Quick Actions (Open Queue, Create Ticket).

**Metric card anatomy**: label, large value, optional icon, and a "View" drill-down link. The whole card is one focusable link whose accessible name reads e.g. "New tickets: 14. View in queue." Clicking opens `/staff/queue` with the card's `drillDown` params pre-applied; the Queue's filter chips show the applied filter and the total equals the card count.

**List rows**: ticket number, summary (truncated with ellipsis, full text in `title`), status badge (text + color), timestamp. Row click opens Ticket Detail. "My Recent Actions Taken" rows show ticket number, description preview, a "Follow-up" badge when required, and open that ticket's Actions Taken area.

**States**
| State | Behavior |
|---|---|
| Loading | Card/list skeletons (shimmer), `aria-busy="true"` on the region |
| Empty (count 0) | Card shows `0` with muted text, no drill-down link; lists show "Nothing to show yet." with a helpful hint |
| Forbidden (403) | Standard Forbidden card with a link back to the user's allowed home |
| Failure | Inline alert "We couldn't load the dashboard." with **Retry**; previously loaded data is kept if present |
| Admin extra | Optional concise "Users: N active / N inactive" card linking to User Management |

**Responsive**: tablet (768–991px) → cards wrap 3 per row; mobile (< 768px) → cards stack 2 per row, lists stack vertically, no horizontal page scroll.

## 3. Requester Dashboard (`/dashboard`, Requester)

Data: `GET /api/dashboard/requester`. Shows only the signed-in Requester's tickets.

1. Header: "Welcome, {first name}" + subtitle.
2. **Metric cards** (4): Active Tickets · Waiting for You (highlighted when > 0, with a text label "Needs your attention", not color alone) · Resolved · Closed. Each links to My Tickets with the card's `status` filter applied; list total equals the card count.
3. **Recently Updated** (max 5) and **Recently Resolved** (max 5): ticket number, summary, status badge, updated time; row opens Requester Ticket Detail.
4. Quick Actions: Create Ticket, View My Tickets.
5. The dashboard does not duplicate the My Tickets table (no search/sort/pagination).

States, responsive rules, and accessibility behavior are the same pattern as §2. A Requester navigating to the staff dashboard route sees Forbidden.

## 4. Actions Taken on Ticket Detail

Appears as a new tab/section **"Actions Taken (n)"** on the IT Staff Ticket Detail, alongside Public Comments, Internal Notes, and Attachments. The Requester Ticket Detail shows a **read-only** "Actions Taken" section.

### 4.1 List / table
- Columns (desktop): Date/Time · Performed by · Assignee · Status (text badge: Planned / Completed / Cancelled) · Description · Result · Follow-up (badge "Follow-up required" or "—") · Attachment Notes · (staff only) Edit.
- Order: `actionDateTime` ascending, ties by id (stable). Newest appears at the bottom; the list scrolls inside its card, never the page.
- Mobile: each action becomes a card with labeled fields in the same order.
- Empty state: "No actions have been recorded for this ticket yet." (staff also see the **Add Action** button; Requesters do not).
- Follow-up note appears beneath the row (expandable on mobile) when `followUpRequired` is true.

### 4.2 Create mode (IT Staff/Admin)
Opened by **Add Action** (inline panel, not a modal, so focus order is simple and nothing overlaps).

| Field | Control | Rules |
|---|---|---|
| Action date/time | Read-only text (set by server at save) | Editable only if the team allows backdating; shows "Set when saved" otherwise |
| Performed by | Read-only (your name) | Auto |
| Description * | Textarea, 1–2000, live counter | Required |
| Result * | Textarea, 1–1000, live counter | Required |
| Follow-up required? | Toggle (Yes/No) | Default No |
| Follow-up note | Textarea | Appears and becomes **required** when toggle = Yes; hidden/disabled when No |
| Assignee | Select of **active** IT Staff/Admin (optional) | Inactive users are not offered; a server 400 shows "This user is inactive." |
| Status | Read-only badge "Planned" on create | Changed later with Complete / Cancel |
| Attachment notes | Text, ≤ 500 | Helper text: "Describe which file to look for (e.g. 'photo of the old battery in Attachments')." |

Buttons: **Save Action** (primary, shows spinner and disables on submit — prevents duplicates; sends one `Idempotency-Key` per open form), **Cancel** (confirms if the form has unsaved text).
Validation: inline error directly under the field (`role="alert"` text + icon), plus focus moves to the first invalid field on submit. On `5xx`/network failure a banner appears and **all entered text is preserved**; Retry reuses the same idempotency key.

### 4.3 Reassign, Complete, Cancel (no content edit)
- All content fields (Description, Result, Follow-up, Attachment Notes, Performed by, Date/Time) are permanently read-only once saved — there is no Edit control anywhere, matching append-only content (BR-06). The section helper text says "Actions are a permanent record — add a new action for corrections."
- **Reassign** (change Assignee) is available while the action is Planned; staff pick a new active assignee from the same select as create, or "Unassigned". There is no Delete control anywhere — an unwanted action is cancelled, not removed.
- **Complete** and **Cancel** buttons appear on Planned rows (staff only); Cancel asks for confirmation. After success the row's status badge, assignee, and `completedAt` refresh from the response.
- A `409 Conflict` shows: "This action was changed by someone else. Reload to see the latest version." with a **Reload** button; the user's draft stays visible in the form.
- Requester view: same list/cards, no Add/Edit controls rendered (not merely disabled).

### 4.4 Assignee and action status (decision D-1: adopted)
Add an **Assignee** select (active IT Staff/Admin only; inactive users are not offered and a stale choice shows "This user is inactive") and a **Status** badge/select (Planned · Completed · Cancelled) with **Complete** and **Cancel** buttons on a planned row. Status badges use text labels in addition to color.

## 5. Ticket Workflow and Resolution Feedback

On IT Staff Ticket Detail:
- The status action bar shows **only** transitions permitted for the current status (button labels from Lab 3 §3.5). Terminal statuses (Cancelled) show no buttons.
- Every workflow button sends `expectedVersion`. During the request the bar is disabled with a spinner (no double submit).
- Success: the ticket summary header (status badge, owner, priority) refreshes immediately from the response and a success toast ("Status changed to In Progress") is announced via `aria-live="polite"`.
- `400` invalid transition: inline alert "That change isn't allowed from the current status." and the bar re-renders from the server's current status.
- `409` conflict: alert "This ticket was changed by someone else." with **Reload ticket**; no change is applied.
- The Requester's "Problem Appears Resolved" badge is shown to staff as advisory ("Requester says resolved — please verify") and does not move the status.
- Requester Ticket Detail shows the status and the full Actions Taken list read-only, plus the existing "Problem Appears Resolved" toggle.

## 6. Final Regression and Hardening Checklist (UI)

- [ ] All Lab 1–3 screens reachable by their permitted roles; unauthorized destinations are absent from navigation
- [ ] Loading, validation, success, empty/no-results, forbidden, conflict, not-found, and safe-failure feedback use the same components everywhere
- [ ] Create/update controls disable while submitting; retries are idempotent
- [ ] Forms keep entered data after recoverable failures
- [ ] No console errors, broken links, placeholder text ("Lorem", "TODO"), or inert buttons
- [ ] Obsolete Lab 2 artifacts removed (dev requester selector remnants, duplicate `.js` test copies, unused components/types)
- [ ] Internal Notes remain visually distinct (amber) and are never rendered for Requesters (visible to IT Staff and Administrators per D-3)
- [ ] README setup, seed, migration, test, and demo steps verified from a clean clone

## 7. Responsive and Accessibility Rules

- Breakpoints: desktop ≥ 992px, tablet 768–991px, mobile < 768px. Tables become stacked cards on mobile; wide tables scroll inside their own container only. **No horizontal page scrolling at 375px.**
- Keyboard: every control reachable in logical order; metric cards and rows activate with Enter/Space; visible Zen Green focus ring (`0 0 0 3px rgba(11,122,70,0.25)`) never clipped by `overflow`.
- Semantics: labels bound to inputs (`for`/`id`), `aria-describedby` for helper/error text, `aria-live` for toasts and async results, tables with `<th scope>`; metric cards expose "label: value. action".
- Non-color cues: statuses, priorities, follow-up, and required-attention use text (and icon) in addition to color. Contrast ≥ 4.5:1 for body text.
- Touch targets ≥ 40px on mobile.
- Modals (if any) trap focus, close on Esc, and return focus to the trigger.

## 8. Screens to Capture (desktop / tablet / mobile)

1. Staff Dashboard (populated) · 2. Staff Dashboard (empty/zero metrics) · 3. Requester Dashboard (populated) · 4. Requester Dashboard (zero) · 5. Actions Taken list with multiple actions on one ticket · 6. Add Action form with follow-up validation error · 7. Requester read-only Actions Taken · 8. Workflow conflict (409) message · plus regression shots of the Lab 3 screens. Targets: `artifacts/lab-04/screenshots/{staff-dashboard,requester-dashboard,actions-taken}/`.
