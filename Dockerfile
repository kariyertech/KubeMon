FROM python:3.11

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install supervisor

COPY . .

EXPOSE 8000

CMD ["supervisord", "-c", "/app/supervisord.conf"]
