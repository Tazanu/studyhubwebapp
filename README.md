# StudyHub — Collaborative E-Learning Platform

StudyHub is a full-stack web application that connects students through shared notes, group study chats, a Q&A forum, and tutor discovery. It supports premium content monetization via mobile money payments and is installable as a Progressive Web App (PWA).

---

## Features

- **Authentication** — JWT-based register/login with role support (student, admin)
- **Notes** — Upload, browse, and download study notes; premium notes locked behind payment
- **Study Groups** — Create or join groups, real-time group chat with file attachments, reply & edit support, typing indicators, and unread counts
- **Q&A Forum** — Ask questions, post answers with audio/image attachments, upvote answers
- **Tutors** — Browse tutor profiles and apply to become a tutor
- **Payments** — Mobile money payments via MeSomb to unlock premium notes
- **Notifications** — Real-time notification bell with unread badge
- **Admin Dashboard** — Manage users, notes, groups, tutor applications, and platform stats
- **PWA** — Installable on mobile and desktop, offline banner, service worker caching
- **Dark / Light theme** — Persistent theme toggle

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 19 + Vite | UI framework & build tool |
| Tailwind CSS v4 | Styling |
| Framer Motion | Animations |
| React Router v7 | Client-side routing |
| Axios | HTTP client |
| Socket.IO Client | Real-time events |
| Recharts | Admin analytics charts |
| Lucide React | Icons |
| Sonner | Toast notifications |
| vite-plugin-pwa | PWA support |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express 5 | REST API server |
| PostgreSQL + Prisma ORM | Database |
| Socket.IO | Real-time messaging |
| JWT + bcryptjs | Auth & password hashing |
| Multer | File uploads |
| MeSomb SDK | Mobile money payments |
| Helmet + express-rate-limit | Security |

---

## Project Structure

```
studyhub-v2/
├── backend/
│   ├── prisma/          # Prisma schema & generated client
│   ├── src/
│   │   ├── middleware/  # Auth, rate limiter, upload, roles
│   │   ├── routes/      # auth, groups, notes, qa, payments, admin…
│   │   ├── index.js     # Express app entry point
│   │   └── socket.js    # Socket.IO setup
│   └── uploads/         # Uploaded files (gitignored)
└── frontend/
    ├── public/          # PWA icons, favicon
    └── src/
        ├── api/         # Axios client
        ├── components/  # Navbar, Sidebar, Modals, etc.
        ├── context/     # AuthContext, ThemeContext
        ├── hooks/       # useOnlineStatus, useInView
        └── pages/       # All route pages
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- MeSomb account (for payments)

### 1. Clone the repo

```bash
git clone https://github.com/Tazanu/studyhubwebapp.git
cd studyhubwebapp
```

### 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env   # fill in your values
npx prisma generate
npx prisma db push
npm run dev
```

### 3. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env   # fill in your values
npm run dev
```

---

## Environment Variables

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
JWT_SECRET=<your_jwt_secret>
MESOMB_APPLICATION_KEY=<your_mesomb_key>
MESOMB_ACCESS_KEY=<your_mesomb_access_key>
MESOMB_SECRET_KEY=<your_mesomb_secret_key>
PORT=5000
FRONTEND_URL=http://localhost:5173
RATE_API_MAX=500
RATE_PAYMENT_MAX=20
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:5000/api
```

---

## Scripts

### Backend
| Command | Description |
|---|---|
| `npm run dev` | Start with nodemon (hot reload) |
| `npm start` | Start in production |

### Frontend
| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

---

## Deployment

- **Backend**: Deploy to [Render](https://render.com) as a Web Service. Set all env vars in the Render dashboard. Ensure `uploads/` is on a persistent disk.
- **Frontend**: Deploy to [Vercel](https://vercel.com) or Render as a static site. Set `VITE_API_URL` to your backend's production URL.

See `RENDER_DEPLOYMENT_CHECKLIST.md` for a full deployment guide.

---

## License

MIT © Tazanu
