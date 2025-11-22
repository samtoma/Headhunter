# 🧠 Headhunter AI

**Headhunter AI** is a professional, self-hosted Applicant Tracking System (ATS) built for privacy and performance. It runs entirely on your own hardware (like a Beelink Mini PC with Intel N100) using Docker.

It leverages **Large Language Models (LLMs)** to intelligently parse resumes (PDF/DOCX), extracting structured data like skills, detailed work history, education, and personal details into a searchable database.

## ✨ Key Features

### 🤖 Hybrid AI Engine (Smart & Flexible)
* **Fast Mode (Cloud):** Automatically uses **OpenAI (`gpt-4o-mini`)** if an API key is provided. Extremely fast and accurate.
* **Private Mode (Local):** Falls back to a local **Llama 3.1 8B (Quantized)** model running on your hardware if no key is found.
* **Hardware Acceleration:** Fully optimized for **Intel Integrated GPUs (iGPU)** using OpenCL drivers (perfect for N100/Alder Lake chips).

### 📄 Intelligent Parsing
* Extracts **Contact Info** (Email, Phone, Social Links).
* Parses **Work History** into a structured timeline.
* Identifies **Education**, **Skills**, and **Personal Details** (Age, Marital Status).
* **Smart Experience Calculation:** Automatically calculates "Experience Drift." If a CV is 2 years old, the system adds those 2 years to the candidate's total experience estimate.

### 💻 Modern Dashboard
* **Search & Filter:** Instantly find candidates by name, job title, or specific skills.
* **PDF Viewer:** View the original resume file directly inside the candidate profile without downloading it.
* **Management:** Delete or Reprocess CVs with a single click.

---

## 🛠️ Tech Stack

* **Frontend:** React 18, Vite, Tailwind CSS, Lucide Icons.
* **Backend:** FastAPI (Python 3.13), SQLAlchemy, Pydantic.
* **AI Inference:** `llama-cpp-python` (with OpenCL support) / OpenAI SDK.
* **Database:** PostgreSQL 15.
* **Vector DB:** ChromaDB (included for future semantic search).
* **Infrastructure:** Docker & Docker Compose.

---

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone [https://github.com/samtoma/Headhunter.git](https://github.com/samtoma/Headhunter.git)
cd Headhunter
```

### 2. Configure Environment
Create a `.env` file in the project root. This file holds your secrets and is ignored by Git.

```bash
nano .env
```

**Paste this configuration:**
```ini
# --- Database Credentials ---
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=headhunter_db
DATABASE_URL=postgresql://user:password@db:5432/headhunter_db

# --- AI Configuration ---
# Option A: Use OpenAI (Recommended for Speed & Accuracy)
OPENAI_API_KEY=sk-your-openai-key-here
OPENAI_MODEL=gpt-4o-mini

# Option B: Use Local GPU (Leave API Key empty to use Local Llama)
# OPENAI_API_KEY=
```

### 3. Download the Local Model (Required for Local Mode)
If you plan to use the local GPU, you must download the GGUF model file.
*Note: This file is ~5GB and is ignored by Git.*

```bash
mkdir -p ai/models
wget -O ai/models/llama-3.1-8b-instruct-q4_k_m.gguf \
[https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf?download=true](https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf?download=true)
```

### 4. Build and Launch
Run this command to build the containers. The first build will take 5-10 minutes as it compiles the Intel OpenCL drivers from source.

```bash
docker compose up -d --build
```

---

## 🖥️ Usage Guide

### Access the Dashboard
Open your browser and go to: **`http://<YOUR-NAS-IP>:30004`**

### Core Workflows
1.  **Upload Candidates:**
    * Drag & drop PDF/DOCX files onto the "Upload CV" button.
    * Watch the status change from "Uploading..." to "Processing..." to "Done!".
2.  **View Profiles:**
    * Click on any candidate card to open the **Detail Modal**.
    * See the full **Work History Timeline**, **Education**, and **Skills**.
    * Click the **"View PDF"** button (top right) to see the original file.
3.  **Search:**
    * Type "Python" or "Manager" in the search bar to filter the list instantly.
4.  **Manage Data:**
    * **Reprocess:** If a CV failed or you updated the parser logic, click the **Rotate Icon** on the card to re-parse it.
    * **Delete:** Click the **Trash Icon** to remove the candidate and file permanently.

---

## 🔧 Troubleshooting & Maintenance

### 1. Database Schema Errors
If you update the code and see errors like `column "xyz" does not exist`, you need to reset the database to apply the new structure.

**The "Nuclear" Reset Command:**
```bash
docker compose down
sudo rm -rf data/db/* # WARNING: Deletes all parsed data
docker compose up -d
```

### 2. Verify GPU Acceleration (Local Mode)
To confirm your Intel iGPU is being used by the container:
```bash
docker exec -it headhunter_backend clinfo
```
* **Success:** You should see `Number of platforms: 1` and `Device Name: Intel(R) Graphics`.
* **Failure:** If it shows 0 platforms, ensure `/dev/dri` is passed correctly in `docker-compose.yml`.

---

## 📂 Project Structure

```text
Headhunter/
├── .env                    # Secrets (Not in Git)
├── docker-compose.yml      # Infrastructure Config
├── backend/                # Python FastAPI Application
│   ├── app/
│   │   ├── models/         # Database Schemas
│   │   ├── services/       # AI Logic (Parser)
│   │   └── api/            # REST Endpoints
│   └── Dockerfile          # Compiles OpenCL Drivers
├── frontend/               # React + Vite Application
│   ├── src/                # UI Components & Logic
│   └── Dockerfile          # Node.js container
├── ai/                     # Local AI Models Storage
└── data/                   # Persisted Data (DB & Uploads)
```

---

## 📜 License
MIT License. Built by **Samuel Toma** as an Open Source AI Project.
