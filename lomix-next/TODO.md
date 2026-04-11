# 🚀 Lomix Project TODO List

## 📱 Mobile API Development (Data Persistence)
- [ ] **Mock to Production:** Convert the following mockup endpoints to fetch data from the PostgreSQL database via Prisma:
  - [ ] `GET /api/mobile/profile` (Get real user level, prestige points, and wallet balance).
  - [ ] `GET /api/mobile/recommended-users` (Fetch users based on activity or recommendation algorithm).
  - [ ] `GET /api/mobile/stories/prices` (Manage prices through a database settings table).
  - [ ] `GET /api/mobile/stories/users` (List users with active stories).
  - [ ] `POST /api/mobile/stories/add` (Implement image/video upload and database entry).
- [ ] **Queue Status:** Connect `GET /api/mobile/queue-status` to the actual Bull/Redis email queue if available.

## 🔐 Security & Authentication
- [ ] **Social Login Implementation:**
  - [ ] **Facebook Login:** Implement/Verify token validation via Facebook Graph API.
  - [ ] **Apple Login:** Implement/Verify ID Token verification using Apple's public keys.
- [ ] **Session Management:** Add Refresh Token support for better mobile UX.
- [ ] **Role Control:** Ensure only users with `admin` role can access Admin API endpoints (Middleware is active, but sub-routes need testing).

## 🖥️ Admin Dashboard (Next.js)
- [ ] **Dynamic Data:** Ensure all dashboard cards (CPU, RAM, Email Stats) are fetching live data.
- [ ] **User Management:** Complete the CRUD operations (Edit/Delete) for users, roles, and groups.
- [ ] **Log Viewer:** Improve the `/dashboard/logs` page with better filtering (level, date range).
- [ ] **API Documentation:** Keep Swagger JSDoc updated for all new mobile features.

## 🛠️ Technical Improvements
- [ ] **Performance:** Add indexing to frequently queried fields in `schema.prisma` (e.g., email, username).
- [ ] **Logging:** Fine-tune the `src/lib/logger.ts` to rotate files properly in production.
- [ ] **Environment:** Ensure `.env` variables are correctly set for production (SSL, SMTP, Database).

---
*Last Updated: 2026-01-25*

userss 
