# Role-Based Permissions

This document defines the access control matrix for all user roles in Headhunter.

## User Roles

| Role | Description | Default Department |
|------|-------------|-------------------|
| **Admin** | Full system access, company settings | HR |
| **Recruiter** | Full recruitment access, read-only settings | HR |
| **Hiring Manager** | Department-scoped access | Assigned department |
| **Interviewer** | Interview-only access | Assigned department |
| **Super Admin** | Cross-company global admin | N/A |

---

## Permission Matrix

### Dashboard & Navigation

| Feature | Admin | Recruiter | Hiring Manager | Interviewer |
|---------|:-----:|:---------:|:--------------:|:-----------:|
| Dashboard Overview | ✅ Full | ✅ Full | 🔶 Dept Only | ❌ Limited |
| AI Search | ✅ | ✅ | 🔶 Dept Only | ❌ |
| Analytics | ✅ | ✅ | 🔶 Dept Only | ❌ |
| Interviews Page | ✅ All | ✅ All | 🔶 Dept Only | ❌ Own Only |

### Candidate & Pipeline Management

| Feature | Admin | Recruiter | Hiring Manager | Interviewer |
|---------|:-----:|:---------:|:--------------:|:-----------:|
| View All Pipelines | ✅ | ✅ | 🔶 Dept Only | ❌ |
| Create Pipeline | ✅ | ✅ | ✅ Own Dept | ❌ |
| Upload CVs | ✅ | ✅ | ✅ Own Dept | ❌ |
| View Candidates | ✅ All | ✅ All | 🔶 Dept Only | ❌ Assigned |
| Move Candidates (Pipeline) | ✅ | ✅ | ✅ Own Dept | ❌ |
| Schedule Interviews | ✅ | ✅ | ✅ Own Dept | ❌ |
| Resume Processing Button | ✅ | ✅ | ✅ | ❌ |
| View Salary Info | ✅ | ✅ | ✅ | ❌ Masked |

### Interview Management

| Feature | Admin | Recruiter | Hiring Manager | Interviewer |
|---------|:-----:|:---------:|:--------------:|:-----------:|
| View All Interviews | ✅ | ✅ | 🔶 Dept Only | ❌ Assigned |
| Reschedule Interview | ✅ | ✅ | ✅ Own Dept | ❌ |
| Change Interviewer | ✅ | ✅ | ✅ Own Dept | ❌ |
| Cancel Interview | ✅ | ✅ | ✅ Own Dept | ❌ |
| Mark No-Show | ✅ | ✅ | ✅ Own Dept | ❌ |
| Submit Feedback | ✅ | ✅ | ✅ | ✅ Assigned |
| Interview Mode Page | ✅ | ✅ | ✅ | ✅ Assigned |

### Department Management

| Feature | Admin | Recruiter | Hiring Manager | Interviewer |
|---------|:-----:|:---------:|:--------------:|:-----------:|
| View All Departments | ✅ | ✅ | ❌ Own Only | ❌ |
| Create Department | ✅ | ❌ | ❌ | ❌ |
| Update Department | ✅ | ❌ | ✅ Own Only | ❌ |
| Generate AI Description | ✅ | ❌ | ❌ | ❌ |

### Team Management

| Feature | Admin | Recruiter | Hiring Manager | Interviewer |
|---------|:-----:|:---------:|:--------------:|:-----------:|
| View Team Members | ✅ | ✅ | 🔶 Dept Only | ❌ |
| Add Team Member | ✅ | ✅ | ✅ Own Dept | ❌ |
| Auto-Assign Dept on Add | HR | HR | Own Dept | N/A |
| Remove Team Member | ✅ | ❌ | ❌ | ❌ |
| Change User Role | ✅ | ❌ | ❌ | ❌ |
| Assign to Department | ✅ | ✅ | ❌ | ❌ |

### Company Settings

| Feature | Admin | Recruiter | Hiring Manager | Interviewer |
|---------|:-----:|:---------:|:--------------:|:-----------:|
| Company Profile (Edit) | ✅ | ❌ View | ❌ | ❌ |
| Workflow Settings (Edit) | ✅ | ❌ View | ❌ View | ❌ |
| Extract Company Info (AI) | ✅ | ❌ | ❌ | ❌ |

---

## Department Assignment Rules

### Default Department on User Creation

1. **Admin** → Automatically assigned to "HR" department
2. **Recruiter** → Automatically assigned to "HR" department
3. **Hiring Manager** → Must be assigned to a specific department
4. **Interviewer** → Must be assigned by the person adding them

### When Adding Team Members

| Who is Adding | New Member's Default Department |
|---------------|--------------------------------|
| Admin | Must select (or HR default) |
| Recruiter | Must select (or HR default) |
| Hiring Manager | **Auto-assigned to Manager's department** |

---

## Scope Restrictions

### Hiring Manager Scope

- Can ONLY see pipelines/jobs in their department
- Can ONLY see candidates applied to jobs in their department
- Can ONLY see interviews for jobs in their department
- Can ONLY update their own department's profile
- Cannot create new departments

### Interviewer Scope

- Can ONLY see interviews assigned to them
- Can ONLY see candidate profiles for their assigned interviews
- Cannot see salary information (masked)
- Cannot access pipelines, analytics, or search

---

## Admin Advanced Controls

### User Status Management

Admins have the ability to control the access status of any team member:

- **Active**: Normal access based on role.
- **Deactivated**: User cannot log in. API tokens are revoked. User remains in historical data (audit logs, previous interviews).
- **Suspended**: Temporary block (e.g., for security review).

### Granular Feature Toggles

On top of the standard Role-Based Access Control, Admins can toggle specific capabilities for individual users. These overrides allow fine-tuning access without creating new roles.

| Toggle | Description | Default |
|--------|-------------|---------|
| **Can Export Data** | Allows downloading CSV/Excel reports | Admin Only |
| **Can Delete Candidates** | Allows permanent deletion of records | Admin Only |
| **View Sensitive Info** | Unmasks salary and diversity data | Admin & HR |
| **Beta Features** | Access to features in "Lab" mode | Off |
| **Bypass Dept Scopes** | Allows a Hiring Manager to see other depts | Off |

---

## Implementation Status

- [x] Basic role-based routing (sidebar visibility)
- [x] Resume Processing button visibility
- [ ] Hiring Manager department-scoped data filtering
- [ ] Add Team Member with auto-department assignment
- [ ] Recruiter view-only settings restrictions
- [ ] Interviewer salary masking
- [ ] **User Deactivation/Reactivation**
- [ ] **Granular Feature Flags per User**

---

## API Endpoints Requiring Role Checks

| Endpoint | Roles Allowed |
|----------|---------------|
| `POST /cv/resume-all` | Admin, Recruiter, Hiring Manager |
| `POST /interviews` | Admin, Recruiter, Hiring Manager |
| `PATCH /interviews/{id}` | Admin, Recruiter, Hiring Manager |
| `GET /interviews/all` | Admin, Recruiter (Hiring Manager = dept only) |
| `POST /users/invite` | Admin, Recruiter, Hiring Manager |
| `PATCH /users/{id}/status` | Admin only |
| `PATCH /users/{id}/features` | Admin only |
| `PATCH /departments/{id}` | Admin, Hiring Manager (own dept only) |
| `POST /departments` | Admin only |
| `PATCH /companies/me` | Admin only |
