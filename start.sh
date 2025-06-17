#!/bin/bash
set -e
# Pod toplama döngüsünü başlat (logları stdout'a yönlendir)
python backend/main.py &
MAIN_PID=$!
# Flask API'yi başlat
python backend/api.py &
API_PID=$!
# Her iki processi bekle
wait $MAIN_PID $API_PID
