# RepriseAi

RepriseAi is an application designed for managing leads, predictions, and partner interactions. The project consists of a Python FastAPI backend, multiple React-based frontends, and a React Native mobile app.

## Features

- Backend microservices for admin, auth, predictions, and partner management
- Multiple frontend interfaces: Admin, Customer, Partner-Agent
- Mobile app for on-the-go access
- Database management with SQLAlchemy and Alembic migrations

## Tech Stack

- **Backend**: Python, FastAPI, SQLAlchemy, Pydantic, Alembic
- **Admin Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Partner-Agent Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Mobile App**: React Native, Expo, NativeWind
- **Database**: SQLite (or configured via SQLAlchemy)

## Project Structure

```
RepriseAi/
├── admin/          # Admin frontend (Vite + React)
├── app/            # Mobile app (Expo + React Native)
├── backend/        # FastAPI backend
│   ├── services/   # Microservices
│   ├── shared/     # Shared modules
│   └── alembic/    # Database migrations
├── frontend/       # Customer frontend (Vite + React)
├── partner-agent/  # Partner-Agent frontend (Vite + React)
└── myenv/          # Python virtual environment
```

## Installation

### Prerequisites

- Python 3.8+
- Node.js 16+
- npm or pnpm
- Expo CLI (for mobile app)

### Backend Setup

1. Navigate to the `backend` directory:
   ```
   cd backend
   ```

2. Create and activate a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Run database migrations:
   ```
   alembic upgrade head
   ```

5. (Optional) Populate initial data:
   ```
   python populate_admin_data.py
   ```

### Frontend Setups

#### Admin Frontend
1. Navigate to `admin`:
   ```
   cd admin
   ```

2. Install dependencies:
   ```
   npm install
   # or
   pnpm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

#### Customer Frontend
1. Navigate to `frontend`:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   # or
   pnpm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

#### Partner-Agent Frontend
1. Navigate to `partner-agent`:
   ```
   cd partner-agent
   ```

2. Install dependencies:
   ```
   npm install
   # or
   pnpm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

### Mobile App Setup

1. Navigate to `app`:
   ```
   cd app
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the Expo development server:
   ```
   npm start
   ```

## Usage

1. Start the backend server:
   ```
   cd backend
   source venv/bin/activate
   uvicorn main:app --reload
   ```

2. Start the desired frontends as described in their respective setup sections.

3. For the mobile app, use the Expo app on your device or an emulator to scan the QR code.

## API Documentation

Once the backend is running, visit `http://localhost:8000/docs` for interactive API documentation.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and ensure builds pass
5. Submit a pull request

