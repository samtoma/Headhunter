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
| **AI Engine** | OpenAI / Llama 3.1 | Resume parsing, Job Description generation, Matching. |
| **Vector DB** | ChromaDB | (Infrastructure Ready) Stores embeddings for semantic search. |
| **Storage** | Local Filesystem | Stores raw PDF/DOCX files (`/data/raw`). |

### 📂 Project Structure
```text
Headhunter/
├── backend/                 # FastAPI Application
│   ├── app/
│   │   ├── api/             # REST Endpoints (Jobs, CVs, Profiles)
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

### 1. 🔐 Enterprise Security & SSO
* **Microsoft SSO Integration:** Securely log in using your corporate Microsoft account (Azure AD).
* **Email Verification:** Automated email verification flow to ensure user authenticity.
* **Role-Based Access:** Granular permissions for Admins, Recruiters, and Hiring Managers.

### 2. 🧠 Context-Aware AI Engine
* **Dual-Mode Processing:** Seamlessly switches between **OpenAI (GPT-5-mini)** for speed/accuracy and **Local Llama 3.1** for total privacy.
* **Company Profile Brain:** Define your organization's industry ("Fintech"), culture ("Agile"), and values in the settings. The AI reads this context to tailor every generated job description to sound like *your* company.
* **Smart Contact Extraction:** Uses advanced normalization logic to extract Phone Numbers and Emails even from poorly formatted resumes.
* **Hidden Link Detection:** Deep-scans PDF metadata to find "Click Here" links that point to LinkedIn or GitHub profiles.

### 3. 🚀 Intelligent Pipeline Management
* **Smart Wizard:** Create a job by simply typing a title (e.g., "Senior DevOps"). The AI generates a professional description, required skills, and experience level automatically.
* **Instant Auto-Matching:** As soon as a job is drafted, the system scans your *entire existing database* to suggest "Silver Medalists" or qualified candidates you already have.
* **Kanban Workflows:** Drag-and-drop candidates through stages: *New -> Screening -> Interview -> Offer -> Hired*.

### 4. 🎤 Advanced Interview Management
* **Interview Assignment:** Assign specific team members to conduct interviews directly from the candidate drawer.
* **Detailed History:** Track every interview step (Screening, Technical, Manager) with outcomes (Passed, Failed, Pending).
* **Rich Feedback:** Capture detailed notes, ratings (1-10), and decisions for each interview stage.
* **Visual Timeline:** See the entire interview journey at a glance, including who interviewed the candidate and when.

### 5. 🗂️ Candidate Workbench
* **Bulk Actions:** Select 50+ candidates to **Bulk Assign** to a pipeline, **Delete**, or **Reprocess** (re-run AI extraction) in one click.
* **Edit Mode:** Fix parsing errors directly in the UI. Toggle "Edit Mode" to correct names, years of experience, or summary text.
* **Visual Timeline:** View a candidate's work history in a clean, grouped timeline (LinkedIn-style), organizing multiple roles under the same company.
* **Smart Social Icons:** Automatically detects and brands links for LinkedIn (Blue) and GitHub (Black/Dark).

### 6. 📊 Analytics Dashboard
* **Real-Time KPIs:** Track Active Jobs, Total Candidates, Hires, and "Silver Medalists" (runners-up to keep warm).
* **Pipeline Insights:** See live averages for *Years of Experience*, *Current Salary*, and *Expected Salary* for every open position.

### 7. 📱 Mobile Responsiveness (v1.5)
* **Full Mobile Support:** Complete feature parity on mobile devices with responsive layouts.
* **Touch-Optimized:** All interactive elements are sized for touch (44px+).
* **Smart Drawers:** Sidebars and panels convert to smooth, gesture-friendly drawers on smaller screens.

---

## 🛠️ Installation Guide

### Prerequisites
* **Docker** & **Docker Compose** installed.
* **NVIDIA GPU Drivers** (Optional: Only required for local LLM acceleration).
* **OpenAI API Key** (Recommended for v1.3).
* **Microsoft Azure App Registration** (For SSO).

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd headhunter
```

### 2. Configuration (.env)
Create a `.env` file in the project root.

```ini
# --- AI CONFIGURATION ---
# Recommended Model for V1.3
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-5-mini-2025-08-07

# --- DATABASE CONFIGURATION ---
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=headhunter_db
# Internal Docker Network URL
DATABASE_URL=postgresql://user:password@db:5432/headhunter_db

# --- SSO CONFIGURATION (Microsoft) ---
SSO_CLIENT_ID=your-client-id
SSO_CLIENT_SECRET=your-client-secret
SSO_TENANT_ID=your-tenant-id

# --- EMAIL CONFIGURATION ---
MAIL_USERNAME=your-email@example.com
MAIL_PASSWORD=your-password
MAIL_FROM=no-reply@headhunter.ai
MAIL_PORT=587
MAIL_SERVER=smtp.gmail.com

# --- OPTIONAL: LOCAL LLM ---
# Path to GGUF model inside the container (if using local mode)
# MODEL_PATH=/app/models/llama-3.1-8b-instruct-q4_k_m.gguf
```

### 3. Launch the Stack
This starts all services (Frontend, Backend, DB, VectorDB).

```bash
sudo docker compose up -d --build
```

### 4. Initialize Database
Run the migration script to create the schema (Jobs, Company, CVs).

```bash
sudo docker compose exec backend alembic upgrade head
```

### 5. Access the Application
* **User Interface:** [http://localhost:30004](http://localhost:30004)
* **API Documentation:** [http://localhost:30001/docs](http://localhost:30001/docs)

---
*Generated by Headhunter AI Engineering Team*

## 🔮 Roadmap
1.  **Project Status: Headhunter AI (v1.5)**
    *   Current Status: The system is a fully functional, production-ready Applicant Tracking System (ATS) with Enterprise-grade security, advanced interview management, and **full mobile support**.

    *   Core Capabilities:
            Data Ingestion: It ingests resumes (PDF/DOCX) via a robust drag-and-drop interface that supports bulk uploads (50+ files).
            Intelligent Parsing: It normalizes messy contact data (extracting emails/phones as clean lists) and digs into PDF metadata to find "hidden" LinkedIn/GitHub links.
            Recruitment Workflow: It supports the full lifecycle: creating job tracks, matching candidates, moving them through a Kanban board, and archiving roles when filled.
            Interview Management: Assign interviewers, log detailed feedback, and track outcomes per stage.

2.  **Detailed Feature List**
    *   🧠 AI & Automation
            Optimized for GPT-5 Mini: The backend is tuned to use gpt-5-mini-2025-08-07 with a temperature of 1.0 for maximum creativity and accuracy in parsing.
            Smart Pipeline Wizard: You don't just "create a job." You type a title (e.g., "DevOps Engineer"), and the AI generates a full description, required skills, and experience level based on your Company Profile.
            Auto-Matching: Immediately upon creating a job, the system scans your existing database to suggest "Silver Medalists" or qualified candidates you already have.

    *   🗂️ Candidate Management
            Bulk Power Tools: You can select 50 candidates at once to Assign them to a new pipeline, Delete them, or Reprocess them (useful if you update the parsing logic).
            Candidate Workbench: A detailed drawer view that lets you edit parsing errors, view the original PDF side-by-side, and see a "LinkedIn-style" timeline of their work history grouped by company.
            Smart Social Icons: The UI automatically detects LinkedIn and GitHub URLs and displays them with their official brand icons and colors.

    *   ⚙️ Configuration
            Company Profile Engine: A global settings module where you define TPAY's industry, culture, and values. This context is injected into every AI prompt to ensure generated content sounds like your company.
            Archive System: Keep your workspace clean by archiving old roles. They are hidden by default but can be toggled back into view.

3.  **Future Roadmap (Next Steps)**
    *   **Semantic Search (The "AI Brain"):**
        *Concept:* Connect the running ChromaDB container.
        *Goal:* Enable queries like "Find me a frontend dev who knows 3D graphics" to return candidates with "ThreeJS" or "WebGL" even if keywords don't match exactly.

    *   **Local LLM Refactor:**
        Current State: The local Llama 3.1 flow exists but requires specific model paths and manual setup.
        Next Step: Refactor the local engine to be more robust, perhaps using a standardized model loader or containerized Ollama instance for easier deployment.

    *   **Calendar Sync:**
            Goal: Two-way sync with Google/Outlook calendars for interview scheduling.