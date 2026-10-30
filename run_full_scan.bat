@echo off
rem -------------------------------------------------
rem Run the complete OFFAT‑X 8‑stage scan
rem -------------------------------------------------
cd /d " %~dp0\
node run_tests.js --goal=full
pause
