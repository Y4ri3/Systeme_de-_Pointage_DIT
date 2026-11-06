FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV FLASK_APP=run.py

# start.sh peut arriver avec des fins de ligne Windows (CRLF) depuis un poste Windows.
RUN sed -i 's/\r$//' start.sh && chmod +x start.sh

EXPOSE 5000

CMD ["./start.sh"]
