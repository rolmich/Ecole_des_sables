@echo off
REM ===========================
REM Script to start Docker containers on Windows
REM ===========================

REM Show the current directory
echo Navigating to the project folder...
cd /d "%~dp0"

REM Check if Docker is running
docker info >nul 2>&1
IF ERRORLEVEL 1 (
    echo ERROR: Docker does not seem to be running. Please open Docker Desktop and try again.
    pause
    exit /b 1
)

REM Run Docker Compose
echo Starting Docker containers...
docker compose up -d --build

REM Show the status of the containers
docker ps

echo.
echo ===========================
echo Containers started successfully!
echo ===========================
pause
