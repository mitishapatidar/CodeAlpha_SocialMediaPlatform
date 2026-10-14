# CodeAlpha_SocialMediaPlatform — Instaclone 📸

An **Instagram-style mini social media app** built for the **CodeAlpha Full Stack Development Internship — Task 2**.

**Stack:** HTML, CSS and vanilla JavaScript (frontend) · **Express.js** (backend) · **MongoDB + Mongoose** (database)

## ✨ Features

| Area | What you can do |
|---|---|
| 🔐 Auth | Sign up (live username check), log in with username **or** email, log out, change password (bcrypt + JWT in httpOnly cookie) |
| 👤 User profiles | Profile photo, name, bio, website, posts / followers / following counts, edit profile, share profile link |
| 📝 Posts | Upload 1–10 photos (carousel), caption with #hashtags & @mentions, location, edit / delete, hide like count, turn off comments |
| 💬 Comments | Add, reply (@mention), like, delete (own comments or on your own posts), emoji picker |
| ❤️ Likes | Like / unlike, **double-tap to like** with heart animation, see who liked |
| ➕ Follow system | Follow / unfollow (with confirm), followers & following lists with search, remove a follower, "Suggested for you" |
| 🏠 Home feed | Posts from people you follow, infinite scroll, "You're all caught up" |
| ⭕ Stories | 24-hour stories (auto-deleted with a MongoDB TTL index), story tray, full-screen viewer with progress bars, viewers list |
| 🔍 Explore & Search | Explore grid of popular posts, search users & hashtags, recent searches, hashtag pages |
| 🔔 Notifications | Likes, comments, comment likes and new followers, unread badge |
| 🔖 Saved | Bookmark posts and see them on your Saved tab |
| 🌗 Extras | Dark / light theme, responsive (desktop sidebar + mobile bottom nav), demo account, seed data |

## 🚀 Run locally

```bash
npm install
cp .env.example .env      # then set JWT_SECRET (and MONGO_URI if you have MongoDB)
npm run seed              # optional: demo users, posts & stories
npm start                 # http://localhost:5000
```

- **No MongoDB installed?** Leave `MONGO_URI` empty — the app starts a built-in local MongoDB (via `mongodb-memory-server`) and stores data in `./.data`.
- **MongoDB Atlas / local MongoDB:** set `MONGO_URI=mongodb+srv://...` in `.env`.
- Demo login after seeding: **`demo` / `demo123`** (or click *Log in with demo account*).

## 🗂️ Project structure

```
server/
  server.js            Express app, static files, SPA fallback
  config/db.js         MongoDB connection
  models/              User, Post, Comment, Notification, Story
  routes/              auth, users, posts, comments, stories, notifications, search
  middleware/          auth (JWT), upload (multer)
  seed.js              demo data
public/
  login.html, signup.html, index.html
  css/                 base, auth, app styles
  js/                  router, api, store, components/, views/
uploads/               user-uploaded images
```

## 🔌 REST API (main endpoints)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` · `/login` · `/logout` | Authentication |
| GET | `/api/auth/me` | Current user |
| GET/PUT | `/api/users/:username` · `/api/users/me` | View / edit profile |
| POST | `/api/users/:username/follow` | Follow / unfollow |
| GET | `/api/users/:username/followers` · `/following` · `/posts` · `/saved` | Lists |
| GET | `/api/posts/feed` · `/explore` · `/tag/:tag` | Feeds |
| POST/PUT/DELETE | `/api/posts` · `/api/posts/:id` | Create / edit / delete post |
| PUT/DELETE | `/api/posts/:id/like` · `/save` | Like, save |
| GET/POST | `/api/posts/:id/comments` | Comments |
| DELETE · PUT | `/api/comments/:id` · `/api/comments/:id/like` | Delete / like comment |
| GET/POST | `/api/stories` | Story tray / add story |
| GET | `/api/notifications` · `/api/search?q=` | Activity, search |

---
Made by **Mitisha Patidar** for the CodeAlpha Full Stack Development Internship.
