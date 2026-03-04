@echo off
echo Configurando tuneles USB...
adb reverse tcp:8081 tcp:8081
echo Iniciando receptor de audio...
start main.exe
echo ¡Listo! Abre la app en tu Android y presiona Start.
pause
