# Mess Manager Backend

A Node.js + Express + MongoDB backend for the Mess Management System.

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm init -y
npm install express mongoose cors bcryptjs jsonwebtoken nodemailer dotenv
```

### 2. Configure Environment Variables

Copy the `.env.example` file to `.env` and update the values:

```bash
cp .env.example .env
```

Required environment variables:
- `MONGO_URI` - Your MongoDB Atlas connection string
- `PORT` - Server port (default: 5000)
- `JWT_SECRET` - Secret key for JWT tokens
- `EMAIL_USER` - Gmail address for sending OTP emails
- `EMAIL_PASS` - Gmail App Password (NOT your regular password)

### 3. Set Up MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account or sign in
3. Create a new cluster (free tier is fine)
4. Create a database user with read/write access
5. Whitelist your IP address (or use 0.0.0.0/0 for development)
6. Get your connection string and update `MONGO_URI` in `.env`

### 4. Set Up Gmail for OTP Emails

1. Enable 2-Step Verification in your Google Account
2. Go to Google Account > Security > App passwords
3. Generate a new app password for "Mail"
4. Use this password as `EMAIL_PASS` in `.env`

### 5. Run the Server

```bash
node index.js
```

The server will start on `http://localhost:5000` (or your configured port).

## API Endpoints

### Authentication
- `POST /api/auth/register/manager` - Register a new manager with mess
- `POST /api/auth/register/member` - Register a new member
- `POST /api/auth/login` - Login user
- `POST /api/auth/update-password` - Update user password
- `POST /api/auth/verify-password` - Verify user password

### OTP
- `POST /api/send-otp` - Send OTP email
- `POST /api/verify-otp` - Verify OTP code

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `GET /api/users/email/:email` - Get user by email
- `GET /api/users/mess/:messId` - Get users by mess ID
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Messes
- `GET /api/messes` - Get all messes
- `GET /api/messes/:id` - Get mess by ID
- `GET /api/messes/code/:code` - Get mess by code
- `POST /api/messes` - Create mess
- `PUT /api/messes/:id` - Update mess
- `DELETE /api/messes/:id` - Delete mess (and all related data)

### Months
- `GET /api/months` - Get all months
- `GET /api/months/mess/:messId` - Get months by mess ID
- `GET /api/months/mess/:messId/active` - Get active month
- `POST /api/months` - Create month
- `PUT /api/months/:id` - Update month

### Meals
- `GET /api/meals/month/:monthId` - Get meals by month
- `GET /api/meals/user/:userId/month/:monthId` - Get user meals
- `POST /api/meals` - Create meal
- `PUT /api/meals/:id` - Update meal
- `DELETE /api/meals/:id` - Delete meal

### Deposits
- `GET /api/deposits/month/:monthId` - Get deposits by month
- `GET /api/deposits/user/:userId/month/:monthId` - Get user deposits
- `POST /api/deposits` - Create deposit
- `PUT /api/deposits/:id` - Update deposit
- `DELETE /api/deposits/:id` - Delete deposit

### Meal Costs
- `GET /api/meal-costs/month/:monthId` - Get meal costs by month
- `POST /api/meal-costs` - Create meal cost
- `PUT /api/meal-costs/:id` - Update meal cost
- `DELETE /api/meal-costs/:id` - Delete meal cost

### Other Costs
- `GET /api/other-costs/month/:monthId` - Get other costs by month
- `POST /api/other-costs` - Create other cost
- `PUT /api/other-costs/:id` - Update other cost
- `DELETE /api/other-costs/:id` - Delete other cost

### Join Requests
- `GET /api/join-requests/mess/:messId` - Get join requests by mess
- `GET /api/join-requests/mess/:messId/pending` - Get pending join requests
- `GET /api/join-requests/user/:userId` - Get user's join requests
- `POST /api/join-requests` - Create join request
- `PUT /api/join-requests/:id` - Update join request
- `DELETE /api/join-requests/:id` - Delete join request

### Notices
- `GET /api/notices/mess/:messId` - Get notices by mess
- `GET /api/notices/mess/:messId/latest` - Get latest notice
- `POST /api/notices` - Create notice
- `PUT /api/notices/:id` - Update notice
- `DELETE /api/notices/:id` - Delete notice

### Bazar Dates
- `GET /api/bazar-dates/mess/:messId` - Get bazar dates by mess
- `POST /api/bazar-dates` - Create bazar date
- `PUT /api/bazar-dates/:id` - Update bazar date
- `DELETE /api/bazar-dates/:id` - Delete bazar date

### Notifications
- `GET /api/notifications/user/:userId` - Get user notifications
- `GET /api/notifications/user/:userId/unseen-count` - Get unseen count
- `POST /api/notifications` - Create notification
- `PUT /api/notifications/:id/seen` - Mark as seen
- `PUT /api/notifications/user/:userId/seen-all` - Mark all as seen
- `DELETE /api/notifications/:id` - Delete notification
- `DELETE /api/notifications/user/:userId` - Delete all user notifications

### Notes
- `GET /api/notes/mess/:messId` - Get notes by mess
- `POST /api/notes` - Create note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note

## Frontend Integration

In your frontend, update `src/lib/config.ts`:

```typescript
export const USE_BACKEND = true;
export const API_BASE_URL = 'http://localhost:5000/api';
```

## Production Deployment

1. Use a process manager like PM2: `npm install -g pm2 && pm2 start index.js`
2. Set up proper environment variables
3. Use HTTPS
4. Restrict CORS to your frontend domain
5. Use a strong JWT_SECRET
