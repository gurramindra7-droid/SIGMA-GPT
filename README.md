# SIGMA-GPT

SIGMA-GPT is an AI-powered conversational web application that allows users to interact with an AI assistant through a modern web interface. The application supports authenticated users and guest users with different access permissions.

The project is engineered by **GURRAM INDRASENA YADAV**.

---

## Features

### AI Chat

* Send natural-language prompts to the AI assistant.
* Receive AI-generated responses.
* Support for multi-turn conversations.
* Structured display of AI responses.
* Code and technical content formatting.
* Conversation-based interaction.

### Authentication

* User registration and login.
* Authenticated user sessions.
* User-specific application access.
* Logout functionality.
* Profile management.

### Guest Mode

SIGMA-GPT provides a guest mode for users who want to try the application without creating an account.

Guest users can:

* Send text prompts.
* Receive AI responses.
* Use the basic messaging interface.

Guest users cannot access:

* Photo/image functionality.
* Image upload functionality.
* Video functionality.
* Video upload functionality.
* Other restricted multimedia operations.

Authenticated users retain access to the features available to their account.

---

## User Interface

The application provides:

* Responsive chat interface.
* Conversation sidebar.
* Chat history.
* Message composer.
* User profile interface.
* Authentication interface.
* Responsive layouts for different screen sizes.
* Dark blue-based interface design.
* Interactive UI components.
* Code block formatting and copy functionality.

---

## Technology Stack

### Frontend

* React.js
* Vite
* JavaScript
* HTML5
* CSS3

### Backend

* Node.js
* Express.js
* REST APIs

### AI

* LLM-based conversational AI
* GROQ API
* Llama-based language model

### Database

* MongoDB

### Authentication & Security

* Authentication middleware
* Session/user authorization
* Guest access restrictions
* Protected API operations

### Development Tools

* Git
* GitHub
* npm
* VS Code
* Postman

---

## Project Structure

```text
SIGMA-GPT/
│
├── BACKEND/
│   ├── index.js
│   ├── package.json
│   └── ...
│
├── FRONTEND/
│   ├── public/
│   │   └── ...
│   │
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatMessage.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── ...
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   │
│   │   ├── pages/
│   │   │   └── Chat.jsx
│   │   │
│   │   ├── styles/
│   │   │   ├── chat.css
│   │   │   ├── intro.css
│   │   │   └── ...
│   │   │
│   │   ├── App.jsx
│   │   └── ...
│   │
│   ├── index.html
│   ├── package.json
│   └── ...
│
└── README.md
```

---

## Application Flow

```text
User
 │
 ├── Register / Login
 │        │
 │        ▼
 │   Authenticated User
 │        │
 │        ├── AI Chat
 │        ├── Chat History
 │        ├── Profile
 │        └── Available Multimedia Features
 │
 └── Continue as Guest
          │
          ▼
       Guest User
          │
          └── Text Chat Only
```

---

## Getting Started

### Prerequisites

Make sure the following are installed:

* Node.js
* npm
* Git
* MongoDB
* VS Code

---

## Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
```

Navigate into the project:

```bash
cd SIGMA-GPT
```

---

# Frontend Setup

Navigate to the frontend directory:

```bash
cd FRONTEND
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend will normally be available at:

```text
http://localhost:5173
```

---

# Backend Setup

Open another terminal.

Navigate to:

```bash
cd SIGMA-GPT/BACKEND
```

Install dependencies:

```bash
npm install
```

Start the backend:

```bash
npm start
```

If the project uses a development script instead:

```bash
npm run dev
```

---

# Environment Variables

Create the required `.env` files according to the project's configuration.

Example frontend configuration:

```env
VITE_API_URL=http://localhost:5000
```

Example backend configuration:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
GROQ_API_KEY=your_groq_api_key
```

Use the exact variable names expected by the existing source code.

**Do not upload `.env` files or API keys to GitHub.**

Add them to `.gitignore`:

```text
.env
.env.local
.env.production
```

---

# Running the Project

Run the frontend and backend separately.

### Terminal 1 — Frontend

```bash
cd FRONTEND
npm run dev
```

### Terminal 2 — Backend

```bash
cd BACKEND
npm start
```

Then open the frontend URL in your browser.

---

# API Communication

The frontend communicates with the backend through HTTP requests.

```text
React Frontend
      │
      │ HTTP Requests
      ▼
Node.js / Express Backend
      │
      ├── Authentication
      ├── AI Requests
      ├── User Operations
      └── Database Operations
              │
              ▼
           MongoDB
```

The backend handles communication between the frontend, AI service, and database.

---

# Guest Access Control

SIGMA-GPT implements separate access levels for authenticated and guest users.

### Guest

```text
Text Messaging
     ✓

Photo/Image Features
     ✗

Video Features
     ✗
```

### Authenticated User

```text
Text Messaging
     ✓

Available Image Features
     ✓

Available Video Features
     ✓

Account Features
     ✓
```

Access restrictions are implemented at the application/API level rather than relying only on frontend visibility.

---

# Database

MongoDB is used for storing application data such as user and conversation information.

The database configuration is provided through environment variables.

Do not commit database credentials to the repository.

---

# Development

After making changes:

```bash
git status
```

Stage the changes:

```bash
git add .
```

Commit:

```bash
git commit -m "Update SIGMA-GPT"
```

Push:

```bash
git push origin main
```

---

# Testing Checklist

Before pushing changes to GitHub, verify:

* [ ] Frontend starts successfully.
* [ ] Backend starts successfully.
* [ ] User registration works.
* [ ] User login works.
* [ ] Logout works.
* [ ] AI messaging works.
* [ ] Conversation history works.
* [ ] Guest mode works.
* [ ] Guest users can send text messages.
* [ ] Guest users cannot access restricted image features.
* [ ] Guest users cannot access restricted video features.
* [ ] Authenticated user features work.
* [ ] Profile functionality works.
* [ ] Responsive layout works.
* [ ] No major browser console errors.
* [ ] Production build completes successfully.

---

# Production Build

To create a frontend production build:

```bash
cd FRONTEND
npm run build
```

The generated production files can be found in the project's build output directory.

---

# Security

The project follows basic application security practices including:

* Environment variables for secrets.
* Protected user functionality.
* Authentication-based access.
* Guest access restrictions.
* Backend-side authorization checks.
* No API keys stored directly in source code.

Never commit:

```text
.env
API keys
Database passwords
Access tokens
Private credentials
```

---

# Future Improvements

Possible future improvements include:

* Improved conversation search.
* Conversation renaming and organization.
* Advanced user settings.
* Streaming AI responses.
* Improved file handling.
* More granular user permissions.
* Enhanced monitoring and logging.
* Automated testing.
* Improved deployment infrastructure.

---

# Author

**GURRAM INDRASENA YADAV**

Full Stack Developer

Project: **SIGMA-GPT**

---

# License

This project is developed for educational and portfolio purposes.

Add an appropriate open-source license if the repository is intended for public redistribution.
