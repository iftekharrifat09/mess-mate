# Mess Mate

You are a senior Django full-stack engineer and system architect.

Build a complete production-ready Django web application named:

“MESS MANAGER”

Use ONLY:
- Python Django
- Django ORM
- Django Authentication
- Django Templates
- Bootstrap 5 (or Bootstrap 4)
- SQLite or PostgreSQL

❌ DO NOT use React
❌ DO NOT use any SPA framework
✔ Server-rendered Django Templates only


====================================================
USER ROLES
====================================================

There are ONLY two roles:
1. Manager
2. Member

Use a CUSTOM USER MODEL:
- Email as USERNAME_FIELD
- Role field (manager / member)
- Approval status
- is_active control


====================================================
AUTHENTICATION & REGISTRATION
====================================================

MANAGER REGISTRATION:
- Manager creates a Mess with:
  - Full Name
  - Mess Name
  - Phone Number
  - Email
  - Password
- Mess is created automatically
- Manager assigned to Mess
- Login via email & password
- Redirect to Manager Dashboard

MEMBER LOGIN:
- Member logs in using Email & Password
- Member can login ONLY if approved by Manager
- If not approved:
  - Show: “Waiting for manager approval”
- If approved:
  - Redirect to Member Dashboard


====================================================
DASHBOARD DESIGN (IMPORTANT)
====================================================

⚠️ BOTH MANAGER & MEMBER DASHBOARD MUST USE
THE SAME UI DESIGN AND LAYOUT (LIKE PROVIDED SCREENSHOT)

- Same cards
- Same layout
- Same colors
- Same structure

Difference is ONLY in:
- Visible data
- Permissions
- Actions


====================================================
MANAGER DASHBOARD
====================================================

Manager dashboard shows:

LEFT SUMMARY CARD:
- Current Month (Running)
- Mess Balance
- Total Deposit
- Total Meal
- Total Meal Cost
- Meal Rate (auto calculated)
- Total Individual Cost
- Total Shared Cost
- Link to “This Month Full Details”

RIGHT PERSONAL INFO CARDS:
- My Total Meal
- My Deposit
- My Cost
- My Balance
- Bazar Date section

ALL MEMBER INFO SECTION:
- List of all members
- Each member card shows:
  - Total Meal
  - Deposit
  - Meal Cost
  - Individual Cost
  - Shared Cost
  - Balance


====================================================
MEMBER DASHBOARD (SAME UI – LIMITED DATA)
====================================================

Member Dashboard MUST LOOK EXACTLY LIKE Manager Dashboard
(Same layout, same cards, same structure)

BUT with these rules:

LEFT SUMMARY CARD:
- Current Month
- Mess Balance
- Total Deposit
- Total Meal
- Total Meal Cost
- Meal Rate
- Total Individual Cost
- Total Shared Cost

RIGHT PERSONAL INFO CARDS:
- My Total Meal
- My Deposit
- My Cost
- My Balance
- My Bazar Date (read-only or request based)

ALL MEMBER INFO SECTION:
- Member can SEE all members summary
- BUT:
  - Cannot edit
  - Cannot delete
  - Cannot manage anyone
- Read-only cards only

MEMBER RESTRICTIONS:
- Cannot add deposit
- Cannot add cost
- Cannot add meal for others
- Cannot add/remove members
- Cannot start new month
- Cannot change manager


====================================================
MANAGER FEATURES
====================================================

- Add Member by Email
- Approve / Reject Member Requests
- Remove Member
- Change Manager Role
- Add Deposit
- Add Meal
- Add Meal Cost
- Add Other Cost
- View Active Month Details
- Export PDF
- Start New Month


====================================================
MEMBER FEATURES
====================================================

- View dashboard (same UI)
- View active month details
- View all members summary (read-only)
- View own meal, deposit, balance


====================================================
DATABASE MODELS
====================================================

Create Django models for:
- CustomUser
- Mess
- Membership
- Month
- Meal
- Deposit
- MealCost
- OtherCost
- JoinRequest

Use:
- ForeignKey
- related_name
- signals
- clean constraints


====================================================
SECURITY & PERMISSIONS
====================================================

- Role-based access control
- Decorators / Mixins for Manager-only views
- Mess-level data isolation
- Member read-only restrictions


====================================================
UI REQUIREMENTS
====================================================

- Bootstrap-based layout
- Sidebar navigation
- Top navbar
- Cards and tables
- Responsive design
- Follow screenshots EXACTLY


====================================================
DELIVERABLES
====================================================

Provide:
1. Django project structure
2. settings.py changes
3. Models
4. Views
5. URLs
6. Templates
7. Admin setup
8. Instructions to run project


====================================================
IMPORTANT RULES
====================================================

- Do NOT simplify logic
- Do NOT skip features
- Same dashboard UI for Manager & Member
- Only permission logic differs
- Production-quality Django code only

END OF PROMPT

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://meal-khata.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d002884b-9504-420f-877f-2855af4db29d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
