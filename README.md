# StaffHub - Staff Management for an Outsourcing Company

React + Node.js (Express) + MySQL.

## Features
- Login with roles: Admin, Manager/HR, Employee (hashed passwords, JWT)
- Employees: add, edit, delete, search, filter, create login
- Clients: companies that hire our staff
- Assignments: deploy staff to clients with bill rate, bench tracking
- Attendance: daily sheet for managers, check-in/check-out for employees
- Leave requests: apply, approve, reject
- Dashboard with charts
- Reports: employees, bench, client billing, attendance, leaves (CSV export + print to PDF)

## Database tables
users, employees, clients, assignments, attendance, leaves (see `server/src/schema.sql`).

## Quick run (this PC)
1. Double-click `start-mysql.bat` (keep that window open).
2. In a terminal: `cd server` then `npm start`
3. In another terminal: `cd client` then `npm run dev`
4. Open http://localhost:5173

Note: `start-mysql.bat` only works on this PC because it points to `C:\Users\selin\mysql`. On a new device, follow the steps below.

## Setup on a new device

### 1. Install the tools
- **Node.js** (version 18 or newer): https://nodejs.org (pick the LTS version).
- **MySQL Server 8**: pick ONE of these options.
  - **Option A: MySQL Installer (recommended)**
    1. Download from https://dev.mysql.com/downloads/installer/
    2. Choose "Server only" (or "Custom" and add MySQL Server + MySQL Workbench).
    3. Keep port `3306`.
    4. Set a **root password** and remember it.
    5. Leave "Start MySQL Server at System Startup" ticked. MySQL then runs by itself as a Windows service.
  - **Option B: XAMPP**
    1. Download from https://www.apachefriends.org
    2. Open the XAMPP Control Panel and click **Start** next to MySQL.
    3. The default user is `root` with an **empty password**.

Check that Node is installed:
```
node -v
npm -v
```

### 2. Copy the project
Copy the whole `staff-management` folder to the new PC (USB, zip or Git). You don't need to copy the `node_modules` folders. They get recreated in step 4.

### 3. Set the database login
Go into the `server` folder and make a `.env` file from the example:
```
cd server
copy .env.example .env
```
Open `server/.env` and fill in your MySQL details:
```
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_root_password
DB_NAME=staff_management
JWT_SECRET=any_long_random_text
```
If you used XAMPP, leave `DB_PASSWORD=` empty.

You don't need to create the database or tables yourself. On the first start, the backend automatically:
- creates the `staff_management` database
- creates all tables from `server/src/schema.sql`
- adds demo data (users, employees, clients, assignments, attendance, leaves)

### 4. Install packages and start the backend
```
cd server
npm install
npm start
```
You should see `API running on http://localhost:5000`. Keep this terminal open.

### 5. Start the frontend
Open a second terminal:
```
cd client
npm install
npm run dev
```
Open http://localhost:5173 in the browser and log in with a demo account below.

### Optional: view the database
- MySQL Workbench: connect to `localhost:3306` as `root`, then open the `staff_management` schema.
- XAMPP: open http://localhost/phpmyadmin

### Reset the demo data
To start fresh, drop the database and restart the backend. It will be created again with the demo data.
```sql
DROP DATABASE staff_management;
```

### Common problems
- **"Failed to start. Check your MySQL settings"**: MySQL is not running, or the password in `server/.env` is wrong.
- **"Access denied for user 'root'"**: wrong `DB_PASSWORD` in `server/.env`.
- **Port 3306 or 5000 already in use**: close the other program, or change `DB_PORT` / `PORT` in `.env`. If you change `PORT`, also update the proxy in `client/vite.config.js`.
- **Login page says "Network Error"**: the backend is not running. Start it with `npm start` in the `server` folder.
- **PowerShell blocks `npm`** ("running scripts is disabled"): run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or use Command Prompt instead.

## Project structure
```
staff-management/
  server/        Express API (routes, auth, MySQL connection, schema, seed data)
  client/        React app (Vite)
```

## Demo logins
| Role | Email | Password |
|---|---|---|
| Admin | admin@staffhub.com | admin123 |
| Manager | manager@staffhub.com | manager123 |
| Employee | ravi@staffhub.com | employee123 |
