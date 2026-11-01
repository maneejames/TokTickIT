# TokTickIT — Test Accounts & Credentials Reference

This document lists all seeded test user accounts, credentials, roles, and their intended testing purposes across TokTickIT.

---

## 🔑 Global Default Password

For all seeded accounts listed below, the default password is:

```text
Password123!
```

*(Case-sensitive, includes uppercase `P`, lowercase letters, digits `123`, and exclamation mark `!`)*

---

## 1. 🛡️ Administrator Accounts

Administrators have full system access, including User Management (`/admin/users`), IT Staff Ticket Queue & Detail operations (under Decision D-3), and Actions Taken management.

| Name | Email (Login ID) | Password | Active? | Must Change Password? | Key Testing Purpose |
|---|---|---|---|---|---|
| **Central Administrator** | `admin@kmutt.ac.th` | `Password123!` | ✅ Yes | ❌ No | User Management, resetting passwords, deactivating users, auditing all tickets & actions |

---

## 2. 🛠️ IT Staff Accounts

IT Staff can manage the Ticket Queue (`/staff/queue`), claim and reassign tickets, update ticket statuses and priorities, add Internal Notes, and record/manage Actions Taken.

| Name | Email (Login ID) | Password | Active? | Must Change Password? | Key Testing Purpose |
|---|---|---|---|---|---|
| **Witchai Tech** | `staff.witchai@kmutt.ac.th` | `Password123!` | ✅ Yes | ❌ No | Primary IT Staff; owns active tickets, records actions taken |
| **Kamon Support** | `staff.kamon@kmutt.ac.th` | `Password123!` | ✅ Yes | ❌ No | Secondary IT Staff; assignee for planned actions, owns tickets |
| **Naree Network** | `staff.naree@kmutt.ac.th` | `Password123!` | ✅ Yes | ❌ No | Network specialist; test multi-staff ticket queues |
| **Former Staff** | `staff.inactive@kmutt.ac.th` | `Password123!` | ❌ **Inactive** | ❌ No | **Negative test**: cannot log in (401), excluded from Assignee selects |

---

## 3. 👤 Requester Accounts

Requesters can create tickets (`/tickets/create`), view their own tickets in My Tickets (`/tickets`), view Ticket Detail in read-only mode, post Public Comments, toggle "Problem Appears Resolved", and view Actions Taken in read-only mode.

| Name | Email (Login ID) | Password | Active? | Must Change Password? | Key Testing Purpose |
|---|---|---|---|---|---|
| **Somchai Jaidee** | `somchai.jai@kmutt.ac.th` | `Password123!` | ✅ Yes | ❌ No | Primary requester; owns tickets with actions taken, tests read-only actions view |
| **Suda Rakdee** | `suda.rak@kmutt.ac.th` | `Password123!` | ✅ Yes | ❌ No | Secondary requester; tests ticket scoping & cross-requester isolation (404) |
| **Wichai Meesook** | `wichai.mee@kmutt.ac.th` | `Password123!` | ✅ Yes | ❌ No | Standard requester ticket submission |
| **Anong Chalong** | `anong.cha@kmutt.ac.th` | `Password123!` | ✅ Yes | ❌ No | Standard requester ticket submission |
| **John Doe** | `john.doe@kmutt.ac.th` | `Password123!` | ✅ Yes | ❌ No | Legacy requester account |
| **Jane Smith** | `jane.smith@kmutt.ac.th` | `Password123!` | ✅ Yes | ❌ No | Legacy requester account |

---

## 4. ⚠️ Special Test Accounts

These accounts are explicitly configured to verify authentication edge cases, route guards, and account deactivation:

| Name | Email (Login ID) | Password | Active? | Must Change Password? | Edge Case Tested |
|---|---|---|---|---|---|
| **Temporary Requester** | `temp.req@kmutt.ac.th` | `Password123!` | ✅ Yes | ⚠️ **`true`** | **Mandatory Password Change**: Logging in immediately redirects to `/change-password`; blocked from other routes until password is changed |
| **Inactive Requester** | `inactive.req@kmutt.ac.th` | `Password123!` | ❌ **Inactive** | ❌ No | **Account Deactivation**: Login returns `401 Unauthorized` with account inactive error |
| **Anon Olduser** | `anon.old@kmutt.ac.th` | `Password123!` | ❌ **Inactive** | ❌ No | **Legacy Deactivated**: Verifies legacy inactive accounts cannot access the system |

---

## 🚀 Quick Testing Scenarios

1. **Test Actions Taken (Staff Mode):**
   - Log in as `staff.witchai@kmutt.ac.th` (`Password123!`)
   - Navigate to `/staff/tickets/1`
   - Scroll to "Actions Taken" section -> click "Add Action" -> fill Description & Result -> Save Action.
2. **Test Actions Taken (Requester Read-Only Mode):**
   - Log in as `somchai.jai@kmutt.ac.th` (`Password123!`)
   - Navigate to `/tickets/1`
   - Verify Actions Taken list is visible, but "Add Action" / edit / status buttons are not rendered.
3. **Test Mandatory Password Change:**
   - Log in as `temp.req@kmutt.ac.th` (`Password123!`)
   - Verify immediate redirect to `/change-password`.
4. **Test Administrator User Management:**
   - Log in as `admin@kmutt.ac.th` (`Password123!`)
   - Navigate to "User Management" (`/admin/users`) to view, edit, activate/deactivate, or reset passwords.

