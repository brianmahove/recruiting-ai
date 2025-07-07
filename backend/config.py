# config.py
import os

class Config: # Make sure this class definition exists and is correctly spelled
    # Database Configuration
    SQLALCHEMY_DATABASE_URI = 'sqlite:///recruiting.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # File Upload Configuration
    UPLOAD_FOLDER = 'uploaded_resumes'
    ALLOWED_EXTENSIONS = {'pdf', 'docx'}

    # Email Configuration
    SMTP_SERVER = os.environ.get('SMTP_SERVER')
    SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
    SMTP_USERNAME = os.environ.get('SMTP_USERNAME')
    SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD')

    # Ensure upload folder exists
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)