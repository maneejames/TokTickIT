# TokTickIT — Lab 3 Self-Capture Screenshot & Evidence Walkthrough

This guide gives you step-by-step instructions to manually reproduce every required screen state and take your own screenshots for your submission slides/report for **Parts 5, 6, 7, 8, and 9**.

### Pre-requisites & Test Accounts
Ensure both servers are running:
- **Backend**: `http://localhost:3000`
- **Frontend**: `http://localhost:5173`

| Role | Email | Password | Special State |
|:---|:---|:---|:---|
| **Requester (Primary)** | `somchai.jai@kmutt.ac.th` | `Password123!` | Active requester with existing tickets |
| **Requester (Inactive)** | `inactive.req@kmutt.ac.th` | `Password123!` | Account deactivated (`isActive: false`) |
| **Requester (First Login)** | `temp.req@kmutt.ac.th` | `Password123!` | Must change password (`mustChangePassword: true`) |
| **IT Staff (Primary)** | `staff.witchai@kmutt.ac.th` | `Password123!` | Active support engineer |
| **Administrator (Primary)** | `admin@kmutt.ac.th` | `Password123!` | Full user management rights |

---

## Part 5: Working Login and Password Change UI

### 5.1 Valid Login
- **How to test**: Navigate to `http://localhost:5173`. Enter `somchai.jai@kmutt.ac.th` and `Password123!`. Click **Sign In**.
- **What to observe**: User logs in cleanly and lands on the *My Tickets* screen.
- **Capture**: Full screen showing successful login.
- **Filename**: `part5-01-valid-login.png`

### 5.2 Invalid Login (Wrong Password / Unknown Email)
- **How to test**: Click Logout, enter `somchai.jai@kmutt.ac.th` and `WrongPassword123!`. Click **Sign In**.
- **What to observe**: Rejection with a top-level alert banner. Does NOT disclose whether email or password was wrong.
- **Capture**: Login card showing the error alert banner.
- **Filename**: `part5-02-invalid-login.png`

### 5.3 Inactive-Account Handling
- **How to test**: On login screen, enter `inactive.req@kmutt.ac.th` and `Password123!`. Click **Sign In**.
- **What to observe**: Account is deactivated (`isActive: false`). System safely rejects with generic error without disclosing account details.
- **Capture**: Login screen showing rejected inactive login.
- **Filename**: `part5-03-inactive-account.png`

### 5.4 Busy and Safe Failure Feedback
- **How to test**:
  - **Busy Feedback**: Because `localhost:3000` responds in under 5ms, open Chrome DevTools (`F12`), go to the **Network** tab, and set throttling to **"Fast 3G"** or **"Slow 3G"**. Click **Sign In**: observe the button enter its disabled state, display the rotating CSS spinner (`.spinner-border-sm`), and change text to *"Signing In..."*.
  - **Safe Failure Feedback**: Enter incorrect credentials and submit: a red alert banner renders at top: *"Invalid email or password"* with zero stack traces, server headers, or internal error leaks.
- **Capture**: Login button during submission showing *"Signing In..."* and rotating spinner, alongside the safe failure banner.
- **Filename**: `part5-04-busy-and-safe-failure.png`

### 5.5 Mandatory First-Password Change Screen
- **How to test**: On login screen, enter `temp.req@kmutt.ac.th` and `Password123!`. Click **Sign In**.
- **What to observe**: User is locked into the `/change-password` barrier:
  - Yellow/amber notice: *"⚠️ First Login Notice: You must choose a new personal password before accessing TokTickIT."*
  - Complexity checklist (min 8 chars, uppercase, lowercase, number, symbol).
  - Navigation links are suppressed; only brand and Logout button remain.
- **Capture**: Full desktop browser on the Change Password barrier.
- **Filename**: `part5-05-mandatory-password-change.png`

### 5.6 Authenticated User/Role Display
- **How to test**: Log in as any user (e.g. `somchai.jai@kmutt.ac.th` or `staff.witchai@kmutt.ac.th`).
- **What to observe**: Top-right corner of the Zen Green header displays the user's name and role badge pill:
  - Requester: `👤 Somchai Jai (Requester)`
  - IT Staff: `👤 Witchai Tech (IT Staff)`
  - Administrator: `👤 Central Administrator (Administrator)`
- **Capture**: Close-up crop or full header showing the user role badge and logout pill.
- **Filename**: `part5-06-authenticated-user-role-display.png`

### 5.7 Logout Action
- **How to test**: Click the white outlined **Logout** button in the top-right header.
- **What to observe**: `POST /api/auth/logout` is dispatched, clearing cookies and local auth state, and the app routes immediately to `/login`.
- **Capture**: Header showing the Logout button or landing on the login screen post-logout.
- **Filename**: `part5-07-logout-action.png`

### 5.8 Direct Access Blocked After Logout
- **How to test**: After logging out, type `http://localhost:5173/staff/queue` or `http://localhost:5173/tickets` directly into your browser address bar and press Enter.
- **What to observe**: The client route guard immediately blocks the access, redirects to `/login`, and leaves all ticket data inaccessible.
- **Capture**: Browser address bar showing attempted protected route being redirected to `/login`.
- **Filename**: `part5-08-direct-access-blocked.png`

---

## Part 6: Working IT Staff Ticket Queue UI

### 6.1 Realistic Queue Data
- **How to test**: Log in as IT Staff: `staff.witchai@kmutt.ac.th` / `Password123!`.
- **What to observe**: Realistic multi-ticket dataset loaded from DB (software, hardware, network, account tickets).
- **Capture**: IT Support Ticket Queue table populated with realistic tickets.
- **Filename**: `part6-01-queue-realistic-data.png`

### 6.2 Search, Filters, Sorting, and Pagination
- **How to test**:
  - **Search**: In search box, type `laptop` or `wifi`. Observe debounced live filtering.
  - **Filters**: Set *Status* filter to `Open` or *IT Priority* filter to `High`.
  - **Sorting**: Click column headers (*Ticket #*, *Created*, *Requested Priority*) to toggle ascending/descending sorting.
  - **Pagination**: Observe page controls at table bottom (`Page 1 of 2`, `Next`, `Previous`) and click `Next`.
- **Capture**: Queue view with search query active, dropdown filter applied, and sort indicator visible.
- **Filename**: `part6-02-search-filter-sort-pagination.png`

### 6.3 Assigned/Unassigned Ownership
- **How to test**: Look at the **Owner** column in the queue table.
- **What to observe**:
  - Assigned tickets display staff name pill (e.g. `Witchai Tech`).
  - Unallocated tickets display gray badge `Unassigned`.
- **Capture**: Queue table rows showing both assigned and unassigned ownership pills.
- **Filename**: `part6-03-assigned-unassigned-ownership.png`

### 6.4 Status and Priority Badges
- **How to test**: Inspect the **Status**, **Requested Priority**, and **IT Priority** columns.
- **What to observe**:
  - Status badges: Color-coded pills (`NEW` green, `OPEN` blue, `IN_PROGRESS` indigo, `RESOLVED` emerald).
  - Priority badges: `LOW` (gray), `MEDIUM` (blue), `HIGH` (amber), `URGENT` (crimson).
  - Requester Resolved: Pale green pill *"Requester Resolved"* when requester marked issue resolved.
- **Capture**: Zoomed or clear table section highlighting the distinct status and priority pills.
- **Filename**: `part6-04-status-priority-badges.png`

### 6.5 Open-Detail Action
- **How to test**: In any row on the queue table, click the **"Open Ticket"** button (or click the Ticket # link).
- **What to observe**: Navigation immediately opens the full IT Staff Ticket Detail view for that specific ticket ID.
- **Capture**: Cursor hovering over or clicking the "Open Ticket" button.
- **Filename**: `part6-05-open-detail-action.png`

### 6.6 Empty / No-Results / Failure Feedback
- **How to test**: In the queue search bar, enter `xyz_nonexistent_filter_query_999`.
- **What to observe**: The table is replaced by a centered Zen card:
  *"No tickets match your filter criteria."* with a primary **"Clear Filters"** button. Clicking "Clear Filters" restores the queue.
- **Capture**: Centered no-results card with the "Clear Filters" button.
- **Filename**: `part6-06-empty-no-results-feedback.png`

### 6.7 Responsive Behavior
- **How to test**: Open Chrome DevTools (`F12` ➔ `Ctrl+Shift+M`) and toggle between:
  - Desktop ($1280 \times 800$): Multi-column data grid with all 9 columns.
  - Tablet ($768 \times 1024$): Filter inputs wrap responsively; table fits container cleanly.
  - Mobile ($375 \times 667$): Grid transforms into vertical stacked card feed with no horizontal overflow.
- **Capture**: Mobile view of the queue showing stacked ticket cards.
- **Filename**: `part6-07-queue-responsive-mobile.png`

---

## Part 7: Working IT Staff Ticket Detail UI

### 7.1 Claim and Reassign
- **How to test**: In Ticket Detail, look at the **Ticket Ownership Bar**:
  - **Claim**: If ticket is unassigned, click **"Claim Ticket"**. The owner immediately updates to your logged-in name (`Witchai Tech`).
  - **Reassign**: Click the **Reassign** dropdown, choose another active staff member (e.g. `Kamon Tech` or `Naree IT`), and verify live owner reassignment.
- **Capture**: Ticket Ownership bar showing Claim button or Reassign dropdown.
- **Filename**: `part7-01-claim-reassign.png`

### 7.2 IT Priority
- **How to test**: Locate the **IT Priority** selector in the ticket header.
- **What to observe**: Change priority from `MEDIUM` to `URGENT`. Live feedback alert confirms *"Priority saved"*.
- **Capture**: IT Priority dropdown and save confirmation toast.
- **Filename**: `part7-02-it-priority.png`

### 7.3 Permitted Status Changes
- **How to test**: Inspect the **Status Lifecycle Action Bar**.
- **What to observe**: Only valid next transitions render per state machine:
  - If `NEW`: *"Mark as Open"*, *"Cancel Ticket"*.
  - If `OPEN`: *"Start Progress"*, *"Cancel Ticket"*.
  - If `IN_PROGRESS`: *"Resolve Ticket"*, *"Wait for Requester"*, *"Cancel Ticket"*.
- **Capture**: Contextual action buttons matching the current ticket status.
- **Filename**: `part7-03-permitted-status-changes.png`

### 7.4 Public Comments vs Internal Notes
- **How to test**: Scroll to the communication hub.
  - **Public Comments**: Light green-tinted card (`#FFFFFF` surface). Add comment *"We are checking the network switch."* and click **Post Public Comment**.
  - **Internal Notes**: Amber card (`background: #FFFBEB; border: 1px solid #FDE68A`). Add diagnostic *"Diagnostic test: IP conflict on VLAN 3."* and click **Add Internal Note**.
- **Capture**: Screen showing the distinct Public Comments section beside/above the amber Internal Notes section.
- **Filename**: `part7-04-public-comments-vs-internal-notes.png`

### 7.5 Attachment Continuity
- **How to test**: In Ticket Detail, locate the **Attachments** section.
- **What to observe**: Files uploaded during ticket creation (or earlier labs) are present:
  - Displays paperclip icon, filename, file size, and upload timestamp.
  - **⬇ Download** button triggers authenticated download stream.
  - Soft-removed attachments appear in dashed audit box (*Audit: Removed Attachments*).
- **Capture**: Attachments section showing active attachment list and download buttons.
- **Filename**: `part7-05-attachment-continuity.png`

### 7.6 Requester Resolution Indication
- **How to test**: 
  - Log in as Requester (`somchai.jai@kmutt.ac.th`), open a ticket, and toggle *"Mark as: Problem Appears Resolved"*.
  - Switch back to IT Staff (`staff.witchai@kmutt.ac.th`) and open that ticket.
- **What to observe**: Prominent pale green pill appears in header:
  *"Requester indicates issue resolved"*.
- **Capture**: Header showing the Requester Resolution badge.
- **Filename**: `part7-06-requester-resolution-indication.png`

### 7.7 Role Restrictions
- **How to test**:
  - Log in as Requester (`somchai.jai@kmutt.ac.th`) and open ticket detail:
    - Internal IT Notes section is completely absent.
    - IT Priority selector is read-only (not a dropdown).
    - Ticket Ownership Bar (Claim/Reassign) is not rendered.
- **Capture**: Requester ticket detail demonstrating the absence of staff-only controls.
- **Filename**: `part7-07-role-restrictions.png`

### 7.8 Validation & Safe Failure Behavior
- **How to test**:
  - **Validation**: On Staff Ticket Detail, try submitting an empty comment. Red warning appears: `⚠️ Comment cannot be empty`.
  - **Safe Failure Behavior**: Enter an invalid ticket ID in URL (`http://localhost:5173/staff/tickets/99999`). App renders clean *"Ticket not found"* card without exposing raw database errors or stack traces.
- **Capture**: Form showing inline validation error `⚠️ Comment cannot be empty` or safe 404 card.
- **Filename**: `part7-08-validation-safe-failure.png`

### 7.9 Direct API Authorization Evidence
- **How to view/verify**: Open `artifacts/lab-03/api-authorization-evidence.md`.
- **What it contains**: Live raw curl outputs for:
  - `401 Unauthorized`: `GET /api/tickets` without cookie.
  - `403 Forbidden`: `GET /api/admin/users` with Requester cookie.
  - `404 Not Found`: `GET /api/tickets/800` (Ticket 800 owned by Requester 2) with Requester 1 cookie (IDOR defense).
- **Capture**: View or excerpt of `artifacts/lab-03/api-authorization-evidence.md`.
- **Filename**: `part7-09-direct-api-authorization-evidence.png`

---

## Part 8: Working Administrator User Management UI

### 8.1 User List (Name, Email, Role, Status, Edit Action)
- **How to test**: Log in as Administrator: `admin@kmutt.ac.th` / `Password123!`. Land on `/admin/users`.
- **What to observe**: Table displays: *Name*, *Email*, *Role* badge, *Status* pill (`Active` / `Inactive`), *Password Change* badge, and *Edit* button.
- **Capture**: Full screen of the User Account Management table.
- **Filename**: `part8-01-user-list.png`

### 8.2 Search by Name or Email & Role Filtering
- **How to test**:
  - Type `Witchai` or `suda` into the search box. Table filters dynamically.
  - Select *Role* filter dropdown ➔ `IT Staff` or `Requester`.
- **Capture**: User table showing active search string and filtered role results.
- **Filename**: `part8-02-search-role-filtering.png`

### 8.3 Create User (Permitted Role & Initial Password)
- **How to test**: Click primary button **"+ Create New User"**.
- **What to observe**: Modal opens with fields for Full Name, Email, Role select (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`), Initial Password, and Account Active checkbox.
- **Capture**: Create New User modal with filled inputs.
- **Filename**: `part8-03-create-user-modal.png`

### 8.4 Duplicate-Email & Invalid-Input Validation
- **How to test**:
  - In Create User modal, enter existing email `somchai.jai@kmutt.ac.th`.
  - Click **Create User**.
- **What to observe**: API returns 409 Conflict; modal renders red error banner:
  *"Email already exists in the system"*.
- **Capture**: Modal showing the red duplicate-email error banner.
- **Filename**: `part8-04-duplicate-email-validation.png`

### 8.5 Edit Name, Email, Role, and Activation State
- **How to test**: In user list, click **Edit** on any user (e.g. `Witchai Tech`).
- **What to observe**: Modal allows updating Full Name, Email, Role dropdown, and toggling *Account Active* switch.
- **Capture**: Edit User modal with controls active.
- **Filename**: `part8-05-edit-user-modal.png`

### 8.6 Set New Initial Password (Forced Change at Next Login)
- **How to test**: In Edit User modal, click **"Set New Initial Password"**. Enter a temporary password and save.
- **What to observe**: User's `mustChangePassword` is set to `true`; table displays `Password Change: Required`.
- **Capture**: Edit modal showing the Reset Temporary Password panel.
- **Filename**: `part8-06-set-initial-password.png`

### 8.7 Prevention of Self-Deactivation & Prevention of Removing Last Active Administrator
- **How to test**:
  - In user list, locate your own account: `Central Administrator` (`admin@kmutt.ac.th`).
  - Click **Edit**.
- **What to observe**:
  - The *Account Active* toggle is disabled/locked.
  - The *Role* dropdown is disabled/locked.
  - Tooltip/notice explains that an administrator cannot deactivate themselves or remove the sole active administrator.
- **Capture**: Edit modal for logged-in administrator showing the locked/disabled active switch and role selector.
- **Filename**: `part8-07-prevention-self-deactivation.png`

### 8.8 Forbidden Access for Non-Administrators (403 Screen)
- **How to test**: Log in as Requester (`somchai.jai@kmutt.ac.th`) or IT Staff (`staff.witchai@kmutt.ac.th`). Navigate in browser to `http://localhost:5173/admin/users`.
- **What to observe**: Renders centered card with red ✕:
  *"Access Forbidden: You do not have permission to view the IT Staff ticket queue. Please switch to an IT Staff account."* (or *"Access Denied: Administrator role required"*).
- **Capture**: Full screen showing the 403 Forbidden rejection card.
- **Filename**: `part8-08-forbidden-access-non-admin.png`

### 8.9 Responsive Zen Green Presentation & Safe Failure Feedback
- **How to test**: View the User Management view at 1280px (desktop), 768px (tablet), and 375px (mobile).
- **What to observe**:
  - Colors adhere to Zen Green tokens (`#006B3C`, `#0B7A46`, `#F5F7F6`).
  - Mobile view wraps controls cleanly without horizontal clipping or scrollbar breakage.
  - Safe failure feedback: network or validation errors display inline banners without raw code traces.
- **Capture**: User management on mobile viewport or responsive split.
- **Filename**: `part8-09-admin-responsive-zen-green.png`

---

## Part 9: Zen Green UI and Responsive Evidence

Follow `artifacts/lab-03/visual-checklist.md` to capture multi-viewport screenshots for all primary screens using Chrome DevTools (`F12` ➔ `Ctrl+Shift+M`):

| Screen | Desktop (1280px) | Tablet (768px) | Mobile (375px) |
|:---|:---|:---|:---|
| **1. Login Screen** | `login-desktop.png` | `login-tablet.png` | `login-mobile.png` |
| **2. Mandatory Password Change** | `change-password-desktop.png` | `change-password-tablet.png` | `change-password-mobile.png` |
| **3. Requester My Tickets** | `my-tickets-desktop.png` | `my-tickets-tablet.png` | `my-tickets-mobile.png` |
| **4. Requester Ticket Detail** | `requester-ticket-detail-desktop.png` | `requester-ticket-detail-tablet.png` | `requester-ticket-detail-mobile.png` |
| **5. IT Staff Ticket Queue** | `queue-desktop.png` | `queue-tablet.png` | `queue-mobile.png` |
| **6. IT Staff Ticket Detail** | `staff-ticket-detail-desktop.png` | `staff-ticket-detail-tablet.png` | `staff-ticket-detail-mobile.png` |
| **7. User Management Table** | `user-management-desktop.png` | `user-management-tablet.png` | `user-management-mobile.png` |
| **8. Edit User Modal** | `edit-user-modal-desktop.png` | `edit-user-modal-tablet.png` | `edit-user-modal-mobile.png` |

---

## Verification Checklist Across All 14 Rubric Items

- [x] **Busy and safe failure feedback** ➔ Covered in **§5.4** & **§8.9**
- [x] **Authenticated user/role display** ➔ Covered in **§5.6**
- [x] **Logout** ➔ Covered in **§5.7**
- [x] **Assigned/unassigned ownership** ➔ Covered in **§6.3**
- [x] **Status and priority badges** ➔ Covered in **§6.4**
- [x] **Open-detail action** ➔ Covered in **§6.5**
- [x] **Responsive behavior** ➔ Covered in **§6.7** & **Part 9**
- [x] **Attachment continuity** ➔ Covered in **§7.5**
- [x] **Role restrictions** ➔ Covered in **§7.7** & **§8.8**
- [x] **Validation** ➔ Covered in **§7.8** & **§8.4**
- [x] **Safe failure behavior** ➔ Covered in **§5.4**, **§7.8**, & **§8.9**
- [x] **Direct API authorization evidence** ➔ Covered in **§7.9** (`artifacts/lab-03/api-authorization-evidence.md`)
- [x] **Prevention of self-deactivation and removing last active admin** ➔ Covered in **§8.7**
- [x] **Responsive Zen Green presentation and safe failure feedback** ➔ Covered in **§8.9** & **Part 9**
