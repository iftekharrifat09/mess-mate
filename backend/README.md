# Mess Management System - Backend API

A Node.js + Express + MongoDB backend for the Mess Management System.

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm init -y
npm install express mongodb cors bcryptjs jsonwebtoken nodemailer dotenv
```

### 2. Configure Environment Variables

Copy the `.env.example` file to `.env` and update the values:

```bash
cp .env.example .env
```

Required environment variables:
- `MONGO_URI` - Your MongoDB Atlas connection string
- `PORT` - Server port (default: 5000)
- `JWT_SECRET` - Secret key for JWT tokens (use a strong random string in production)
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
Check `http://localhost:5000/api/health` to verify MongoDB connection.

## Frontend Configuration

In your frontend project root, create a `.env` file:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_USE_BACKEND=true
```

For production, update `VITE_API_BASE_URL` to your deployed backend URL.

## API Endpoints

### Health Check
- `GET /api/health` - Check server and MongoDB connection status

### Authentication
- `POST /api/auth/register-manager` - Register a new manager with mess
- `POST /api/auth/register-member` - Register a new member
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)
- `PUT /api/auth/profile` - Update profile (requires auth)
- `PUT /api/auth/change-password` - Change password (requires auth)

### Mess Management
- `GET /api/mess` - Get user's mess (requires auth)
- `GET /api/mess/:id` - Get mess by ID
- `GET /api/mess/code/:code` - Get mess by code
- `PUT /api/mess` - Update mess (requires auth)
- `GET /api/mess/members` - Get mess members (requires auth)
- `GET /api/mess/:id/members` - Get mess members by mess ID

### Join Requests
- `GET /api/join-requests` - Get pending join requests for user's mess (requires auth)
- `GET /api/join-requests/user` - Get user's join requests (requires auth)
- `POST /api/join-requests` - Create join request with mess code (requires auth)
- `PUT /api/join-requests/:id/approve` - Approve request (requires auth)
- `PUT /api/join-requests/:id/reject` - Reject request (requires auth)

### Months
- `GET /api/months` - Get all months (requires auth)
- `GET /api/months/active` - Get active month (requires auth)
- `POST /api/months` - Create new month (requires auth)
- `PUT /api/months/:id` - Update month (requires auth)

### Meals
- `GET /api/meals?monthId=xxx` - Get meals by month
- `POST /api/meals` - Create/update meal
- `PUT /api/meals/:id` - Update meal
- `DELETE /api/meals/:id` - Delete meal

### Deposits
- `GET /api/deposits?monthId=xxx` - Get deposits by month
- `POST /api/deposits` - Create deposit
- `PUT /api/deposits/:id` - Update deposit
- `DELETE /api/deposits/:id` - Delete deposit

### Meal Costs
- `GET /api/meal-costs?monthId=xxx` - Get meal costs by month
- `POST /api/meal-costs` - Create meal cost
- `PUT /api/meal-costs/:id` - Update meal cost
- `DELETE /api/meal-costs/:id` - Delete meal cost

### Other Costs
- `GET /api/other-costs?monthId=xxx` - Get other costs by month
- `POST /api/other-costs` - Create other cost
- `PUT /api/other-costs/:id` - Update other cost
- `DELETE /api/other-costs/:id` - Delete other cost

### Notices
- `GET /api/notices` - Get notices for user's mess
- `GET /api/notices/active` - Get active notice
- `POST /api/notices` - Create notice
- `PUT /api/notices/:id` - Update notice
- `DELETE /api/notices/:id` - Delete notice

### Bazar Dates
- `GET /api/bazar-dates` - Get bazar dates for user's mess
- `POST /api/bazar-dates` - Create bazar dates
- `DELETE /api/bazar-dates/:id` - Delete bazar date

### Notifications
- `GET /api/notifications` - Get user's notifications
- `GET /api/notifications/unseen-count` - Get unseen count
- `PUT /api/notifications/mark-seen` - Mark all as seen
- `DELETE /api/notifications/:id` - Delete notification

## Troubleshooting

### "Failed to fetch" error
- Ensure the backend server is running on the correct port
- Check CORS settings if frontend and backend are on different domains
- Verify `VITE_API_BASE_URL` in frontend `.env` matches your backend URL

### "Mess not found" on dashboard
- Check MongoDB connection by visiting `/api/health`
- Verify user's `messId` is set correctly in the database
- Check the backend console for any error messages

### Member approval not working
- Check the join request exists in the `joinRequests` collection
- Verify the manager has the correct `messId`
- Check backend logs for the approve endpoint
- After approval, the member's `messId` and `isApproved` should be updated

### Slow dashboard loading
- Check your MongoDB Atlas cluster location (choose one close to your users)
- Monitor MongoDB Atlas metrics for slow queries
- Ensure proper indexes are created (the backend creates them automatically)

## Production Deployment

1. **Use a process manager:** `npm install -g pm2 && pm2 start index.js`
2. **Set strong JWT_SECRET:** Generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
3. **Use HTTPS:** Put behind a reverse proxy like nginx with SSL
4. **Restrict CORS:** Update CORS settings to only allow your frontend domain
5. **Environment variables:** Never commit `.env` files to version control
