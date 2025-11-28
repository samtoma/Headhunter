# 🧠 Headhunter AI (v1.5)

**Headhunter AI** is a production-grade, self-hosted Applicant Tracking System (ATS) engineered for high-performance recruitment teams. 

Unlike traditional ATS platforms that act as simple file storage, Headhunter AI uses **Context-Aware Large Language Models (LLMs)** to understand your company's specific culture, extract structured data from messy resumes, and proactively match candidates to open pipelines.

---

## 🏗️ System Architecture

The solution is built as a containerized microservices architecture, optimized for local deployment on NAS or private servers.

| Component | Technology | Responsibility |
|-----------|------------|----------------|
| **Frontend** | React 18, Vite, Tailwind | Responsive UI, Kanban Boards, Real-time Dashboards. |
| **Backend** | FastAPI (Python 3.13) | API Logic, AI Orchestration, PDF Parsing. |
| **Database** | PostgreSQL 15 | Relational data (Candidates, Jobs, Applications). |
| **AI Engine** | OpenAI GPT-4o-mini | Resume parsing, Job Description generation, Company profiling, Matching. |
| **Vector DB** | ChromaDB | (Infrastructure Ready) Stores embeddings for semantic search. |
| **Storage** | Local Filesystem | Stores raw PDF/DOCX files (`/data/raw`). |

### 📂 Project Structure
```text
Headhunter/
├── backend/                 # FastAPI Application
│   ├── app/
│   │   ├── api/             # REST Endpoints (Jobs, CVs, Profiles, Company)
│   │   ├── core/            # DB Config & Settings
│   │   ├── models/          # SQLAlchemy Database Models
│   │   ├── schemas/         # Pydantic Data Schemas
│   │   └── services/        # AI Logic (Parser, Matcher)
│   ├── alembic/             # Database Migrations
│   └── Dockerfile
├── frontend/                # React Application
│   ├── src/                 # Components, Hooks, Pages
│   └── Dockerfile
├── data/                    # Persistent Data Volumes
│   ├── db/                  # PostgreSQL Data
│   └── raw/                 # Uploaded Resumes (PDFs)
├── ops/                     # DevOps & Maintenance
│   └── compose/             # Alternative Compose files
├── .env                     # Environment Configuration
└── docker-compose.yml       # Main Production Stack
```

---

## ✨ Feature Deep Dive

### 1. 🏢 Multi-Company Support & Data Isolation
* **Automatic Company Creation:** Companies are automatically created based on email domain during signup.
* **First User = Admin:** The first user from a domain becomes the company admin with full permissions.
* **Complete Data Isolation:** Jobs, candidates, and applications are strictly isolated per company.
* **Role-Based Access Control (RBAC):** Granular permissions for Admins, Recruiters, and Super Admins.
* **Super Admin Dashboard:** Platform-wide view to manage all companies, users, and jobs.

### 2. 🧠 AI-Powered Company Profiling (LinkedIn-Style)
* **Intelligent Website Scraping:** AI automatically extracts comprehensive company information from your website.
* **Multi-Page Analysis:** Scrapes main page, about page, careers page, and more for complete data.
* **16 LinkedIn-Style Fields:**
  - **Basic Info:** Name, Tagline, Industry, Founded Year, Company Size, Headquarters, Company Type
  - **About:** Description, Mission, Vision, Culture, Core Values
  - **Business:** Products/Services, Target Market, Competitive Advantage, Specialties
  - **Social:** LinkedIn, Twitter, Facebook, Logo URL
* **Smart Metadata Extraction:** Reads JSON-LD structured data and meta tags for accurate founding dates and employee counts.
* **Regeneration with Fine-Tuning:** Re-extract company data anytime with custom AI instructions for tailored results.

### 3. 🚀 Comprehensive Job Description Generation
* **11 Detailed Fields:**
  - **Details:** Location, Employment Type, Salary Range
  - **Content:** Responsibilities, Qualifications, Preferred Qualifications
  - **Culture:** Benefits, Team Info, Growth Opportunities, Application Process, Remote Policy
* **Company Context-Aware:** AI uses your company's mission, values, and culture to create authentic job postings.
* **Fine-Tuning Support:** Customize job descriptions with specific instructions (e.g., "emphasize remote-first culture").
* **Regeneration:** Update job descriptions anytime with new AI-generated content.

### 4. 🔐 Enterprise Security & SSO
* **Microsoft SSO Integration:** Securely log in using your corporate Microsoft account (Azure AD).
* **Email Verification:** Automated email verification flow to ensure user authenticity.
* **Secure Authentication:** JWT-based authentication with automatic token refresh.

### 5. 🎯 Context-Aware AI Engine
* **OpenAI GPT-4o-mini:** Optimized for speed, accuracy, and comprehensive data extraction.
* **Company Profile Brain:** Define your organization's industry, culture, mission, and values - the AI reads this context to tailor every interaction.
* **Smart Contact Extraction:** Uses advanced normalization logic to extract Phone Numbers and Emails even from poorly formatted resumes.
* **Hidden Link Detection:** Deep-scans PDF metadata to find "Click Here" links that point to LinkedIn or GitHub profiles.

### 6. � Intelligent Pipeline Management
* **Smart Wizard:** Create a job by simply typing a title (e.g., "Senior DevOps"). The AI generates a professional, comprehensive description with all 11 fields automatically.
* **Instant Auto-Matching:** As soon as a job is drafted, the system scans your *entire existing database* to suggest "Silver Medalists" or qualified candidates you already have.
* **Kanban Workflows:** Drag-and-drop candidates through stages: *New -> Screening -> Interview -> Offer -> Hired*.

### 7. 🎤 Advanced Interview Management
* **Interview Assignment:** Assign specific team members to conduct interviews directly from the candidate drawer.
* **Detailed History:** Track every interview step (Screening, Technical, Manager) with outcomes (Passed, Failed, Pending).
* **Rich Feedback:** Capture detailed notes, ratings (1-10), and decisions for each interview stage.
* **Visual Timeline:** See the entire interview journey at a glance, including who interviewed the candidate and when.

### 8. 🗂️ Candidate Workbench
* **Bulk Actions:** Select 50+ candidates to **Bulk Assign** to a pipeline, **Delete**, or **Reprocess** (re-run AI extraction) in one click.
* **Edit Mode:** Fix parsing errors directly in the UI. Toggle "Edit Mode" to correct names, years of experience, or summary text.
* **Visual Timeline:** View a candidate's work history in a clean, grouped timeline (LinkedIn-style), organizing multiple roles under the same company.
* **Smart Social Icons:** Automatically detects and brands links for LinkedIn (Blue) and GitHub (Black/Dark).

### 9. � Full Mobile Responsiveness
* **Complete Feature Parity:** All features work seamlessly on mobile devices.
* **Touch-Optimized:** All interactive elements are sized for touch (44px+).
* **Smart Drawers:** Sidebars and panels convert to smooth, gesture-friendly drawers on smaller screens.
* **Hamburger Menu:** Elegant mobile navigation with smooth animations.

### 10. 📈 Real-Time Analytics Dashboard
* **Live KPIs:** Track Active Jobs, Total Candidates, Hires, and "Silver Medalists" (runners-up to keep warm).
* **Pipeline Insights:** See live averages for *Years of Experience*, *Current Salary*, and *Expected Salary* for every open position.

---

## 🛠️ Installation Guide

### Prerequisites
* **Docker** & **Docker Compose** installed.
* **OpenAI API Key** (Required for AI features).
* **Microsoft Azure App Registration** (For SSO - Optional).

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd headhunter
```

### 2. Configuration (.env)
Create a `.env` file in the project root.

```ini
# --- AI CONFIGURATION ---
# Required for all AI features (company profiling, job generation, resume parsing)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini

# --- DATABASE CONFIGURATION ---
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=headhunter_db
# Internal Docker Network URL
DATABASE_URL=postgresql://user:password@db:5432/headhunter_db

# --- SSO CONFIGURATION (Microsoft - Optional) ---
SSO_CLIENT_ID=your-client-id
SSO_CLIENT_SECRET=your-client-secret
SSO_TENANT_ID=your-tenant-id

# --- EMAIL CONFIGURATION ---
MAIL_USERNAME=your-email@example.com
MAIL_PASSWORD=your-password
MAIL_FROM=no-reply@headhunter.ai
MAIL_PORT=587
MAIL_SERVER=smtp.gmail.com
```

### 3. Launch the Stack
This starts all services (Frontend, Backend, DB, VectorDB).

```bash
docker compose up -d --build
```

### 4. Initialize Database
Run the migration script to create the schema (Jobs, Company, CVs).

```bash
docker compose exec backend alembic upgrade head
```

### 5. Access the Application
* **User Interface:** [http://localhost:30004](http://localhost:30004)
* **API Documentation:** [http://localhost:30001/docs](http://localhost:30001/docs)

---

## 🎯 Quick Start Guide

### First-Time Setup
1. **Sign Up:** Create an account with your work email (e.g., `john@acme.com`)
2. **Company Creation:** A company is automatically created based on your email domain (`acme.com`)
3. **AI Profile Setup:** Enter your company website URL - AI will extract:
   - Company information (tagline, industry, size, headquarters)
   - Mission, vision, and core values
   - Products/services and competitive advantages
   - Social media links
4. **Create Your First Job:** Click "New Job" and let AI generate a comprehensive description
5. **Upload Resumes:** Drag and drop candidate CVs - AI will parse and extract all information
6. **Start Recruiting:** Match candidates to jobs and manage them through your pipeline!

### Team Collaboration
1. **Invite Team Members:** Share signup link with your team (same email domain)
2. **Auto-Assignment:** New users are automatically added to your company
3. **Role Management:** Admins can promote recruiters or manage permissions
4. **Data Isolation:** Your team only sees your company's data - completely isolated

---

## � Roadmap

### Current Status: v1.5 (Production-Ready)
The system is a fully functional, enterprise-grade Applicant Tracking System with:
* ✅ Multi-company support with complete data isolation
* ✅ AI-powered LinkedIn-style company profiling (16 fields)
* ✅ Comprehensive job description generation (11 fields)
* ✅ AI regeneration with fine-tuning capabilities
* ✅ Advanced interview management
* ✅ Full mobile support
* ✅ Enterprise security & SSO
* ✅ Bulk operations & smart matching

### Future Enhancements
1. **Semantic Search (The "AI Brain"):**
   - Connect ChromaDB for vector-based candidate search
   - Enable queries like "Find me a frontend dev who knows 3D graphics"
   - Return candidates with "ThreeJS" or "WebGL" even if keywords don't match exactly

2. **Enhanced Analytics:**
   - Time-to-hire metrics
   - Source effectiveness tracking
   - Conversion rate analysis
   - Candidate engagement metrics

3. **Calendar Integration:**
   - Two-way sync with Google/Outlook calendars
   - Automated interview scheduling
   - Meeting room booking

4. **Email Automation:**
   - Template-based candidate communication
   - Automated status updates
   - Interview reminders

5. **Advanced Reporting:**
   - Custom report builder
   - Export to Excel/PDF
   - Scheduled email reports

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is proprietary software. All rights reserved.

---

*Built with ❤️ by the Headhunter AI Engineering Team*