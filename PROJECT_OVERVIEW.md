# DeepTrace AI - Project Overview & Changelog

> This document serves as the living overview of the DeepTrace AI codebase. It tracks directory structures, file responsibilities, and ongoing changes during development to make debugging and understanding easier.

## 1. Project Overview
DeepTrace AI is a full-stack SaaS platform designed to verify the authenticity of digital media (images, videos, audio) using multi-agent AI forensic analysis. 

**Core Workflow**:
1. Users upload media via the React Frontend.
2. FastAPI processes the upload, saving to PostgreSQL and MinIO.
3. A Celery worker triggers a LangGraph workflow to run 4 parallel AI agents:
   - **Metadata Agent**: Extracts EXIF/GPS.
   - **Deepfake Agent**: Detects face swaps, GAN artifacts, voice clones.
   - **Forensic Agent**: ELA, shadow consistency, copy-move detection.
   - **Context Agent**: OCR and web verification.
4. An LLM compiles an explainable report and Trust Score (0-100).
5. Frontend visualizes the report and evidence.

---

## 2. File Directory & Responsibilities

### `/backend`
*The core API and background processing engine built with FastAPI, Python, Celery, and LangGraph.*

- **`requirements.txt`**: Contains all the python dependencies required to run the backend (FastAPI, Celery, OpenCV, etc).
- **`Dockerfile`**: Defines the Docker image for the backend API and worker.
- **`app/main.py`**: The entry point for the FastAPI server. Registers all routers, CORS middleware, and global exception handlers.
- **`app/config.py`**: Manages environment variables and configuration (DB URLs, API Keys).
- **`app/database.py`**: Configures the asynchronous SQLAlchemy engine and provides database session dependencies.
- **`app/minio_utils.py`**: Helper functions for uploading/downloading files to the MinIO object storage.
- **`app/pdf_report.py`**: Generates a professional PDF forensic report using `reportlab`.

**Models (`app/models/`)**
- **`user.py`**: Database schema for Users.
- **`media.py`**: Database schemas for MediaFiles and the associated Agent Results (Metadata, Deepfake, Forensic, FactCheck, FinalReport).

**API Routes (`app/api/`)**
- **`auth.py`**: Endpoints for User login and registration, issuing JWTs.
- **`deps.py`**: Dependency injection for securing endpoints (verifying JWT tokens).
- **`reports.py`**: Endpoints for uploading media, checking status, retrieving JSON reports, and downloading PDF reports.
- **`dashboard.py`**: Endpoints for aggregating user statistics (Total analyses, risk distribution, etc.).
- **`admin.py`**: System health and admin endpoints.

**AI Agents (`app/agents/`)**
- **`orchestrator.py`**: The LangGraph `StateGraph`. Routes the uploaded file through all parallel agents and triggers the final report generator.
- **`metadata_agent.py`**: Extracts EXIF data, GPS coordinates, and hashes the file.
- **`deepfake_agent.py`**: Uses Haar cascades and FFT analysis to detect face manipulation and GAN artifacts.
- **`forensic_agent.py`**: Checks for compression inconsistencies, shadow/lighting errors via Sobel, and Error Level Analysis (ELA).
- **`fact_check_agent.py`**: Runs Tesseract OCR to extract text and flags sensational or fake-news related keywords.
- **`trust_score.py`**: Calculates the weighted Trust Score (0-100) based on all agent findings.
- **`llm_report.py`**: Sends aggregated data to Anthropic's Claude API to generate a human-readable AI summary.

**Background Workers (`app/worker/`)**
- **`celery.py`**: Configures the Celery worker app and connects it to the Redis broker.
- **`tasks.py`**: Defines the background task (`run_analysis_pipeline`) that executes the LangGraph workflow and saves results to the database.

---

### `/frontend`
*The user interface built with React, Vite, and TailwindCSS.*

- **`package.json`**: NPM dependencies and run scripts.
- **`vite.config.ts`**: Configures Vite, including the proxy to route `/api` requests to the FastAPI backend.
- **`src/index.css`**: Global stylesheet containing all custom CSS, glassmorphism UI classes, animations, and Tailwind imports.
- **`src/main.tsx`**: React entry point; sets up React Query and Router.
- **`src/App.tsx`**: Defines all public and protected routes for the application.

**Components & Lib (`src/components/`, `src/lib/`, `src/context/`)**
- **`api.ts`**: Custom Axios instance that automatically attaches JWT tokens and handles auto-refreshing expired tokens.
- **`AuthContext.tsx`**: Global React Context managing user state, login, and registration.
- **`Sidebar.tsx`**: The main navigation sidebar shown on protected pages.
- **`ProtectedRoute.tsx`**: A wrapper component that redirects unauthenticated users back to the login page.

**Pages (`src/pages/`)**
- **`LoginPage.tsx` & `RegisterPage.tsx`**: Authentication screens with smooth animations and feature highlights.
- **`DashboardPage.tsx`**: The main user dashboard featuring summary metrics and a Recharts risk distribution graph.
- **`UploadPage.tsx`**: Drag-and-drop file upload interface showing simulated real-time progress for the AI agents.
- **`HistoryPage.tsx`**: A searchable and filterable list of all previous media uploads.
- **`ReportPage.tsx`**: The detailed forensic analysis viewer. Includes a radial Trust Score gauge and tabbed navigation to view specifics for Metadata, Deepfake, Forensic, and Fact-Check results.

---

### Infrastructure
- **`docker-compose.yml`**: The master orchestration file. It spins up 6 interconnected containers:
  - `db` (Postgres database)
  - `redis` (Message broker)
  - `minio` (Object storage)
  - `api` (FastAPI backend)
  - `worker` (Celery background worker)
  - `frontend` (React/Vite development server)
- **`README.md`**: Contains high-level project information and instructions on how to start the application.

---

## 3. Change Log

### [Phase 1 & 2] - Backend & Agent Pipeline (Completed)
- Set up Docker environment, FastAPI base, PostgreSQL, and MinIO storage.
- Built JWT Auth and secure media upload endpoints.
- Developed the LangGraph multi-agent pipeline (`orchestrator.py`).
- Implemented actual OpenCV, Pillow, and text processing logic inside all 4 forensic agents.
- Wired the pipeline into Celery background tasks so uploads don't block the API.

### [Phase 3] - API & Reporting (Completed)
- Generated PDF Reports using `reportlab`.
- Finished REST endpoints in `dashboard.py` and `reports.py` to serve aggregated JSON data to the frontend.

### [Phase 4] - Frontend Development (Completed)
- Scaffolded React with Vite and TailwindCSS v4.
- Built out the entire user interface using a dark-mode glassmorphism aesthetic.
- Implemented React Router, React Query, and Axios interceptors for smooth user experience and authentication.
- Created `LoginPage`, `DashboardPage`, `UploadPage`, `HistoryPage`, and the highly detailed `ReportPage`.

### [Phase 5] - Hardening (Completed)
- Added `pytest` suite for backend validation.
- Finalized `docker-compose.yml` to include the frontend and celery worker.
- Documented everything in `README.md` and this `PROJECT_OVERVIEW.md`.
