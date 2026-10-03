# TokTickIT — Sprint 3 Zen Green UI Specification

`docs/lab-03/ui-spec.md`

---

## 1. Design System & Zen Green Foundations

TokTickIT preserves and extends the **Zen Green Theme** established in Lab 2. All views must feel cohesive, professional, accessible, and responsive.

### 1.1 Core Color Tokens
| Token Name | Hex Value | Purpose / Placement |
|---|---|---|
| `--color-primary-green` | `#006B3C` | Navbar background, primary button background, strong accents |
| `--color-secondary-green` | `#0B7A46` | Hover state for primary buttons, active tab underlines, focus rings |
| `--color-pale-green` | `#EAF6EF` | Row selection tint, callout backgrounds, success badges |
| `--color-page-bg` | `#F5F7F6` | Off-white calm background for the entire application |
| `--color-surface` | `#FFFFFF` | Cards, modal sheets, tables, input fields |
| `--color-border` | `#D1DDD5` | Standard field borders, divider lines, table rules |
| `--color-text-main` | `#1A2E22` | Deep charcoal-green body copy and headings |
| `--color-text-muted` | `#5A6B60` | Secondary metadata, dates, labels, placeholders |
| `--color-field-readonly`| `#EFF3F0` | Non-editable and system-populated inputs |
| `--color-error` | `#B3261E` | Validation errors, destructive actions, critical badges |
| `--color-error-bg` | `#FDF2F2` | Error banner backgrounds, input invalid tint |
| `--color-warning` | `#B58105` | High priority badges, caution callouts |
| `--color-warning-bg` | `#FEF8E8` | High priority badge background, warning banners |
| `--color-internal-note` | `#FFFBEB` | Warm light amber background for IT Internal Notes |
| `--color-internal-border`| `#FDE68A` | Distinguishing border for IT Internal Notes |

### 1.2 Typography & Spacing
- **Font Stack**: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif.
- **Form Controls**: Labels positioned directly above inputs (`14px`, font-weight `600`). Required fields marked with red asterisk `*`. Validation messages rendered directly underneath inputs (`12px`, red `#B3261E`).
- **Focus Rings**: `box-shadow: 0 0 0 3px rgba(11, 122, 70, 0.25)`.
- **Button Touch Target**: Minimum height 40px on all viewports.

---

## 2. Application Shell & Role-Based Navigation

### 2.1 Header Structure
The global navigation bar (`height: 60px`, background: `#006B3C`) changes adaptively based on the authenticated user's role:
- **Brand**: TokTickIT logo + title (clicking brand redirects to role's primary landing view).
- **Navigation Links**:
  - **Requester**: "My Tickets", "Create Ticket"
  - **IT Staff**: "Ticket Queue"
  - **Administrator**: "User Management"
- **User Profile & Logout Widget** (Top-Right):
  - Displays: `👤 [User Name] ([ROLE_BADGE])`
  - Button: "Logout" (compact white outlined pill). Clicking immediately triggers `POST /api/auth/logout` and routes to `/login`.

### 2.2 First-Login Mandatory Password Change Barrier
If the current user has `mustChangePassword: true`:
- The navigation bar renders in restricted mode (no navigation links, only brand and Logout button).
- The main content area is locked to the **Change Password Screen**. Any attempted navigation to `/tickets`, `/queue`, or `/admin` is redirected back to `/change-password`.

### 2.3 Route Guards & Auth Bootstrapping (`useAuth`)
The application client implements an auth bootstrap and routing guard wrapper (`useAuth` context / provider):
1. **Initial Load**: On application launch, `useAuth` calls `GET /api/auth/me`. While verifying, a full-page Zen Green loading spinner/skeleton is shown.
2. **Unauthenticated (401)**: If `GET /api/auth/me` returns `401 Unauthorized` or fails, client clears local user state and immediately redirects to `/login`.
3. **Mandatory Password Change**: If `mustChangePassword: true`, the user is forced and redirected to `/change-password`. All other routes (`/tickets`, `/staff/queue`, `/staff/tickets/:id`, `/admin/users`) are blocked until password change succeeds.
4. **Role Boundary Redirection**:
   - Requesters attempting to access `/staff/*` or `/admin/*` are redirected to `/tickets` with a forbidden toast/notice.
   - IT Staff accessing `/admin/*` or `/tickets` are redirected to `/staff/queue`.
   - Administrators accessing `/tickets` or `/staff/*` are redirected to `/admin/users`.
5. **Logout**: Triggering logout calls `POST /api/auth/logout`, clears user context, and redirects immediately to `/login`.

---

## 3. Screen Specifications

### 3.1 Login Screen (`/login`)
- **Layout**: Centered card (`max-width: 440px`, padding `32px`, border-radius `12px`, surface white on `#F5F7F6`).
- **Header**: TokTickIT brand logo in Zen Green, title "Sign in to TokTickIT", subtitle "Enter your email and password to access the service desk."
- **Fields**:
  - Email Address (type `email`, required, placeholder `user@kmutt.ac.th`)
  - Password (type `password`, required)
- **Controls**:
  - "Sign In" button (Primary Zen Green, full width).
  - Busy State: Button disabled, animated rotating spinner, text: "Signing In...".
- **Error States**:
  - Invalid credentials or inactive account: Red error alert banner at top of card ("Invalid email or password").
  - Form field missing: Red inline validation error below field ("Email is required", "Password is required").

---

### 3.2 Change Password Screen (`/change-password`)
- **Layout**: Centered card (`max-width: 480px`).
- **Header**: Title "Change Temporary Password", alert banner: *"⚠️ First Login Notice: You must choose a new personal password before accessing TokTickIT."*
- **Fields**:
  - Current Password (required)
  - New Password (required, type `password`)
  - Confirm New Password (required, type `password`)
- **Complexity Hints Callout**:
  - Minimum 8 characters
  - At least 1 uppercase letter (A-Z)
  - At least 1 lowercase letter (a-z)
  - At least 1 number (0-9)
  - At least 1 special character (`!@#$%^&*...`)
- **Controls**:
  - "Update Password" button (Primary).
  - "Logout" secondary action if user wishes to abort and exit.

---

### 3.3 Requester Ticket Screens (Regressed & Enhanced)
- **Create Ticket (`/tickets/new`)**:
  - Identical form to Lab 2 (Category, Related System, Priority, Summary, Description, Attachments dropzone).
  - Requester Name field is automatically filled from authenticated user and read-only.
- **My Tickets (`/tickets`)**:
  - Table on desktop (≥992px) and stacked cards on mobile (<768px).
  - Displays only tickets submitted by the authenticated Requester.
- **Requester Ticket Detail (`/tickets/:id`)**:
  - Header with ticket number, status badge, priority badge, category, date, description.
  - Attachments section (download active files, soft-remove modal).
  - **New Section: Problem Appears Resolved**:
    - Checkbox or toggle button: *"Mark as: Problem Appears Resolved"*.
    - Visual badge: When checked, shows green pill *"Requester indicates issue resolved"*.
    - Helper text: *"Does not formally close ticket. IT Staff will verify and complete resolution."*
  - **New Section: Public Comments**:
    - Chronological comment stream with author name, role tag, and timestamp.
    - Comment composer: Textarea (max 2000 chars) with character counter + "Post Public Comment" button.

---

### 3.4 IT Staff Ticket Queue (`/staff/queue`)
- **Header**: Title "IT Support Ticket Queue", total active count badge.
- **Filter Toolbar**:
  - Search bar: Input with search icon, placeholder "Search ticket #, summary, requester...".
  - Status Filter: Multi-select or dropdown (`All`, `New`, `Open`, `In Progress`, `Waiting for Requester`, `Resolved`, `Closed`, `Cancelled`).
  - Priority Filter: Dropdown (`All`, `Low`, `Medium`, `High`, `Urgent`).
  - Category Filter: Dropdown.
  - Ownership Filter: Dropdown (`All Tickets`, `My Assigned Tickets`, `Unassigned Tickets`).
- **Queue Table (Desktop ≥ 992px)**:
  - Columns:
    1. **Ticket #**: e.g., `TICK-20260916-0001` (bold link to detail)
    2. **Created**: Date formatted `DD MMM YYYY`
    3. **Summary**: Text truncated to 60 characters with tooltip
    4. **Category**: Category name
    5. **Requested Priority**: Badge (`LOW`, `MEDIUM`, `HIGH`)
    6. **IT Priority**: Editable or styled badge (`LOW`, `MEDIUM`, `HIGH`, `URGENT`)
    7. **Status**: Zen Green status pill (`New`, `Open`, `In Progress`, `Waiting for Requester`, `Resolved`, `Closed`, `Reopened`, `Cancelled`). If `isRequesterResolved: true`, also display a prominent pale green badge: *"Requester Resolved"*.
    8. **Owner**: Displays assigned IT Staff name or gray pill *"Unassigned"*
    9. **Actions**: "Open Ticket" link/button
- **Queue Card List (Mobile < 768px)**:
  - Stacked card per ticket showing Ticket #, Status badge (plus *"Requester Resolved"* pill when `isRequesterResolved: true`), IT Priority badge, Summary, Owner pill, and "Open" tap area.
- **States**:
  - Loading: Skeleton table rows with animated shimmer.
  - Empty: "No tickets currently in the system."
  - No Search Results: "No tickets match your filter criteria." with "Clear Filters" button.

---

### 3.5 IT Staff Ticket Detail (`/staff/tickets/:id`)
- **Operational Header**:
  - **Ticket Ownership Bar**:
    - Current Owner: `👤 [Staff Name]` or `Unassigned`.
    - Buttons: "Claim Ticket" (if unassigned or assigned to someone else) / "Reassign" (dropdown selecting active IT Staff).
  - **IT Priority Control**:
    - Dropdown allowing instant update of IT Priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`) with save confirmation.
  - **Status Workflow Action Bar**:
    - Current status badge.
    - Permitted Next Actions: Rendered as contextual primary/secondary buttons based on transition matrix:
      - When `NEW` (`New`):
        - Primary: *"Mark as Open"* (transitions to `OPEN`)
        - Secondary/Destructive: *"Cancel Ticket"* (transitions to `CANCELLED`)
      - When `OPEN` (`Open`):
        - Primary: *"Start Progress"* (transitions to `IN_PROGRESS`)
        - Secondary/Destructive: *"Cancel Ticket"* (transitions to `CANCELLED`)
      - When `IN_PROGRESS` (`In Progress`):
        - Secondary: *"Wait for Requester"* (transitions to `WAITING_FOR_REQUESTER`)
        - Primary: *"Resolve Ticket"* (transitions to `RESOLVED`)
        - Destructive: *"Cancel Ticket"* (transitions to `CANCELLED`)
      - When `WAITING_FOR_REQUESTER` (`Waiting for Requester`):
        - Primary: *"Resume Progress"* (transitions to `IN_PROGRESS`)
        - Secondary: *"Resolve Ticket"* (transitions to `RESOLVED`)
        - Destructive: *"Cancel Ticket"* (transitions to `CANCELLED`)
      - When `RESOLVED` (`Resolved`):
        - Primary: *"Close Ticket"* (transitions to `CLOSED`)
        - Secondary: *"Reopen Ticket"* (transitions to `REOPENED`)
      - When `CLOSED` (`Closed`):
        - Secondary: *"Reopen Ticket"* (transitions to `REOPENED`)
      - When `CANCELLED` (`Cancelled`):
        - No transition buttons rendered (Terminal state).
- **Ticket Content**:
  - Requester info, creation date, summary, category, related system, full description.
  - Attachments section (view metadata, download files).
- **Communication Hub (Visually Separated Sections)**:
  1. **Public Comments Section**:
     - Light white/green styling.
     - Banner: *"🌐 Public Comments — Visible to Requester and IT Staff"*.
     - Comment composer + chronological message cards.
  2. **Internal Notes Section**:
     - Prominent Amber/Gold styling (`background: #FFFBEB`, `border: 1px solid #FDE68A`).
     - Distinct Header: *"🔒 Internal IT Notes — Private to IT Staff & Admin (Requesters cannot see this)"*.
     - Note composer: Textarea with amber submit button *"Add Internal Note"*.
     - Chronological list of internal operational notes with staff author badge and timestamp.

---

### 3.6 Administrator User Management (`/admin/users`)
- **Header**: Title "User Account Management", "Create New User" (Primary Zen Green button).
- **Search & Filter Bar**:
  - Search input: Substring match on Name or Email.
  - Role Filter dropdown: `All Roles`, `Requester`, `IT Staff`, `Administrator`.
- **Users Table**:
  - Columns:
    1. **Name**: e.g., `Somchai Jaidee`
    2. **Email**: e.g., `somchai.jai@kmutt.ac.th`
    3. **Role**: Role badge (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`)
    4. **Status**: Green pill `Active` / Gray pill `Inactive`
    5. **Password Change**: Badge `Required` if `mustChangePassword=true`
    6. **Actions**: "Edit" button
- **Create User Modal**:
  - Form Fields:
    - Full Name (required)
    - Email Address (required, valid email format)
    - Role (Select: `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`)
    - Initial Password (required, complexity hints displayed)
    - Account Active (checkbox, default checked)
  - Action Buttons: "Cancel" (Secondary), "Create User" (Primary).
- **Edit User Modal**:
  - Form Fields:
    - Full Name (editable)
    - Email Address (editable)
    - Role (Select dropdown)
    - Account Active toggle/checkbox (Disabled with tooltip if user is current logged-in Administrator or sole remaining active Administrator)
  - **Reset Initial Password Panel**:
    - Expandable section or button: "Set New Initial Password".
    - Input: New Temporary Password.
    - Notice: *"Forces user to change password at next login."*
  - Action Buttons: "Cancel", "Save Changes".

---

## 4. Responsive & Accessibility Rules

### 4.1 Responsive Breakpoints
- **Desktop (≥992px)**: Full multi-column tables, expanded sidebars/navbars, side-by-side comment/note columns if desired.
- **Tablet (768px – 991px)**: Compact tables with horizontal scroll or consolidated columns, modal sheets adapt to 80% screen width.
- **Mobile (<768px)**: Tables transform into stacked cards, action bars float or wrap at bottom, navigation collapses into responsive drawer or stacked buttons.

### 4.2 Accessibility (A11y)
- All interactive controls have visible focus rings (`#0B7A46`).
- Color is never the sole indicator of state: status badges combine colors, borders, and text labels.
- Modal dialogues trap focus, support Escape key closing, and return focus to triggering elements.
