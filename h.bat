@echo off
setlocal enabledelayedexpansion

set "arg1=%~1"

if "%arg1%"=="" (
    echo Usage: .\h ^<role^> ^| install-hooks ^| doctor
    echo.
    echo Roles: admin, developer, planner
    echo.
    echo Current role:
    type "harness\.current-role" 2>nul || echo   none
    goto end
)

if "%arg1%"=="install-hooks" (
    if not exist ".git\hooks" mkdir ".git\hooks"
    copy /Y "harness\hooks\pre-commit" ".git\hooks\pre-commit" >nul
    echo installed: .git/hooks/pre-commit
    goto end
)

if "%arg1%"=="doctor" (
    echo === Doctor Check ===
    echo.
    echo Role:
    type "harness\.current-role" 2>nul || echo   none
    echo.
    if exist "harness\roles.json" (
        echo OK roles.json exists
    ) else (
        echo MISSING harness/roles.json
    )
    if exist "harness\policy\guard.ps1" (
        echo OK guard.ps1 exists
    ) else (
        echo MISSING harness/policy/guard.ps1
    )
    if exist ".git\hooks\pre-commit" (
        echo OK git hook installed
    ) else (
        echo MISSING git hook: run .\h install-hooks
    )
    goto end
)

REM --- Role assignment (validate first) ---
if "%arg1%"=="admin" goto setrole
if "%arg1%"=="developer" goto setrole
if "%arg1%"=="planner" goto setrole
echo ERROR: unknown role "%arg1%". Valid: admin, developer, planner
goto end

:setrole
echo %arg1%> "harness\.current-role"
echo role set: %arg1%
powershell -ExecutionPolicy Bypass -File "harness\policy\guard.ps1" -Stage inspect

:end
endlocal
