@echo off
cd /d "C:\Users\elmer\Downloads\remix-of-sentry-vision-main (1)\remix-of-sentry-vision-main\local-server"
start "" /min "C:\Users\elmer\Downloads\remix-of-sentry-vision-main (1)\remix-of-sentry-vision-main\local-server\bin\mediamtx.exe" "C:\Users\elmer\Downloads\remix-of-sentry-vision-main (1)\remix-of-sentry-vision-main\local-server\mediamtx.yml"
timeout /t 2 /nobreak >nul
start "" /min "C:\Users\elmer\Downloads\remix-of-sentry-vision-main (1)\remix-of-sentry-vision-main\local-server\bin\ffmpeg.exe" -nostdin -hide_banner -loglevel warning -rtsp_transport tcp -i "rtsp://192.168.18.98:554/stream1" -map 0:v:0 -map 0:a:0? -c:v copy -c:a aac -ar 16000 -ac 1 -f rtsp "rtsp://127.0.0.1:8554/cam1"
start "" /min "C:\Users\elmer\Downloads\remix-of-sentry-vision-main (1)\remix-of-sentry-vision-main\local-server\.venv\Scripts\python.exe" "C:\Users\elmer\Downloads\remix-of-sentry-vision-main (1)\remix-of-sentry-vision-main\local-server\camera_server.py"
