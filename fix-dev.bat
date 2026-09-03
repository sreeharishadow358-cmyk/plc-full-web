@echo off
echo PLC Frontend Development Server Fix Script
echo ===========================================

echo.
echo Step 1: Checking for processes using ports 4000 and 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4000') do (
    echo Found process %%a using port 4000
    taskkill /PID %%a /F >nul 2>&1
    echo Killed process %%a
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo Found process %%a using port 3000
    taskkill /PID %%a /F >nul 2>&1
    echo Killed process %%a
)

echo.
echo Step 2: Removing Next.js lock file...
if exist "ui\.next-build\dev\lock" (
    del "ui\.next-build\dev\lock"
    echo Removed Next.js lock file
) else (
    echo No lock file found
)

echo.
echo Step 3: Starting development servers...
npm run dev

echo.
echo Fix script completed!