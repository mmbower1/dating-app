# Pearl

A modern dating app built for genuine connections. Pearl limits users to one active match at a time, encouraging real conversations over endless swiping.

---

## Tech Stack

- **Frontend** — React 19, TypeScript, Vite
- **Backend** — Node.js, Express, TypeScript
- **Database** — MongoDB Atlas (Mongoose)
- **Auth** — JWT
- **Real-time** — Socket.io
- **Photo storage** — Cloudinary
- **Push notifications** — Web Push (VAPID)

---

## Prerequisites

Make sure you have the following installed before getting started:

- [Node.js](https://nodejs.org/) v18 or higher
- [npm](https://www.npmjs.com/) v9 or higher
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account and cluster
- A [Cloudinary](https://cloudinary.com/) account (free tier works)

---

## Clone the repo

```bash
git clone https://github.com/mmbower1/dating-app.git
cd dating-app
```

---

## Environment variables

### Backend — `server/.env`

Create a file at `server/.env` with the following:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=any_long_random_string
CLIENT_URL=http://localhost:5173
ADMIN_SECRET=any_secret_you_choose_for_admin_promotion

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
```

**Generating VAPID keys** (run once in your terminal):

```bash
npx web-push generate-vapid-keys
```

Copy the output into your `.env` file.

### Frontend — `.env`

Create a file at `.env` (root of the project) with the following:

```env
VITE_API_URL=http://localhost:5000/api
```

---

## Install dependencies

Install both the frontend and backend dependencies:

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server && npm install && cd ..
```

---

## Run the app locally

From the root of the project, run:

```bash
npm run dev
```

This starts both the frontend (Vite) and the backend (Express + Socket.io) concurrently.

| Service    | URL                      |
|------------|--------------------------|
| Frontend   | http://localhost:5173    |
| Backend    | http://localhost:5000    |

---

## Promoting an admin

Pearl has an admin panel at `/admin`. To grant a user admin access, call the promote endpoint with your `ADMIN_SECRET`:

```bash
curl -X POST http://localhost:5000/api/admin/promote \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: your_admin_secret_here" \
  -d '{ "email": "user@example.com" }'
```

Once promoted, the user will see an **Admin** button in the top-right corner of the app.

---

## Building for production

```bash
# Build the frontend
npm run build

# Build the backend
cd server && npm run build
```

The compiled frontend goes to `dist/` and the backend to `server/dist/`.

---

## Features

- Discover profiles with photo cards, bio, and detail pills
- Like photos with an optional comment — the liked section appears as a special card in chat on match
- One active match at a time — swiping is locked until the connection ends
- Real-time chat powered by Socket.io with typing indicators
- Graceful exit flow — unmatching requires a message sent directly to the other person
- Accountability score (1–100) based on response rate and ghosting history
- Profile preview — see exactly how your card looks to others
- Push notifications for new matches and messages
- Admin panel to manage users, swipe history, and accountability scores
- Undo last pass within 5 seconds
- Filters for age, distance, ethnicity, religion, height, and more
