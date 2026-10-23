# Lab 4 - Peer Review Record

**Author:** Chaiyaphoom Chenchirotphiphat — 67070503410 — GitHub: [@maneejames](https://github.com/maneejames)

**Peer Reviewer:** YOTSAPOOM LIUPOLVANISH — 67070503493 — GitHub: [@JEWKEW](https://github.com/JEWKEW)

**Project Board:** [TokTickIT Lab 4 Kanban](https://github.com/users/maneejames/projects/6)

---

## 1. Pull Requests I Authored (Lab 4)

| Issue # | Scope / Feature | Branch | PR Link | Reviewer Verdict | Approval Timestamp | Status |
|---|---|---|---|---|---|---|
| #1 | AI Specification Agent — Engineering Contract | `feature/lab4-spec-doc` | *(Pending PR)* | Pending Review | *(Pending)* | In Progress |
| #2 | Review Contract — Ambiguity Resolution | `feature/lab4-spec-review` | *(Pending)* | Pending Review | *(Pending)* | Backlog |
| #3 | Implement — Actions Taken Foundation | `feature/lab4-actions-taken-foundation` | *(Pending)* | Pending Review | *(Pending)* | Backlog |
| #4 | Implement — Actions Taken UI | `feature/lab4-actions-taken-ui` | *(Pending)* | Pending Review | *(Pending)* | Backlog |
| #5 | Implement — Ticket Workflow & Resolution Gate | `feature/lab4-ticket-workflow` | *(Pending)* | Pending Review | *(Pending)* | Backlog |
| #6 | Implement — Role Dashboards | `feature/lab4-dashboards` | *(Pending)* | Pending Review | *(Pending)* | Backlog |
| #7 | Final Hardening & Regression | `feature/lab4-final-hardening` | *(Pending)* | Pending Review | *(Pending)* | Backlog |
| #8 | Completion Review — Audit Against Contract | `feature/lab4-completion-review` | *(Pending)* | Pending Review | *(Pending)* | Backlog |
| #9 | Integration, Release & Submission | `release/lab4-staging-to-main` | *(Pending)* | Pending Review | *(Pending)* | Backlog |

---

## 2. Review Comments I Received and My Responses

### Issue #1: Engineering Contract — `feature/lab4-spec-doc`

- **Branch:** `feature/lab4-spec-doc`
- **Author:** @maneejames
- **Reviewer:** @JEWKEW
- **Review Verdict:** Drafted and verified internally; ready for team review.

**Pre-review Verification Note:**
All four contract documents (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`) were audited and aligned. Inconsistencies resolved:
1. `specification.md` section structure aligned to the 11 required sections from Handout §9 (added explicit §6 UI Specification Summary incorporating the status transition matrix and authorization matrix).
2. `ui-spec.md` §6 checklist corrected to clarify that Internal Notes are visible to IT Staff and Administrators per D-3, and strictly forbidden for Requesters.
3. Every functional requirement (FR-01 to FR-19), business rule (BR-01 to BR-18), and acceptance criterion (AC-01 to AC-18) is mapped to planned automated tests with real file paths.
4. No test pass claims are made in any contract document.

**Final verified state:** Engineering contract baseline verified across `specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md` with complete internal consistency, 4 justified database design decisions, and 100% AC traceability to planned test files.
