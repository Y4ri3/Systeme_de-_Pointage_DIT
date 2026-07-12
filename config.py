import os
from dotenv import load_dotenv
from datetime import timedelta

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-long-enough-for-local-usage'
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or SECRET_KEY
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    MAIL_SERVER = 'smtp.gmail.com'
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER') or MAIL_USERNAME or 'noreply@example.com'
    WIFI_SSID = os.environ.get('WIFI_SSID') or 'DIT_WiFi'
    SEUIL_ABSENCES = 3
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER') or os.path.join(os.getcwd(), 'uploads')
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024
    ARSA_FACE_BASE_URL = os.environ.get('ARSA_FACE_BASE_URL') or 'https://faceapi.arsa.technology/api/v1'
    ARSA_FACE_API_KEY = os.environ.get('ARSA_FACE_API_KEY')
    ARSA_FACE_MATCH_THRESHOLD = float(os.environ.get('ARSA_FACE_MATCH_THRESHOLD') or 0.8)
    ARSA_FACE_LIVENESS_THRESHOLD = float(os.environ.get('ARSA_FACE_LIVENESS_THRESHOLD') or 0.7)
    ARSA_FACE_TIMEOUT_SECONDS = int(os.environ.get('ARSA_FACE_TIMEOUT_SECONDS') or 20)
    ATTENDANCE_KIOSK_API_KEY = os.environ.get('ATTENDANCE_KIOSK_API_KEY')
    FRONTEND_PASSWORD_RESET_URL = (
        os.environ.get('FRONTEND_PASSWORD_RESET_URL') or 'http://localhost:5177/reset-password'
    )
    CORS_ALLOWED_ORIGINS = [
        origin.strip()
        for origin in (os.environ.get('CORS_ALLOWED_ORIGINS') or 'http://localhost:5177,http://127.0.0.1:5177').split(',')
        if origin.strip()
    ]

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///dev.db'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=4)

class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=4)
    JWT_SECRET_KEY = 'testing-jwt-secret-key-32-bytes-minimum'
    MAIL_SUPPRESS_SEND = True

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
