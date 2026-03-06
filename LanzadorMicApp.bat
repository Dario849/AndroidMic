@echo off
echo Configurando tuneles USB...
adb reverse tcp:8082 tcp:8082
echo Iniciando receptor de audio...
start main.exe
echo ¡Listo! Abre la app en tu Android y presiona Start.
pause
