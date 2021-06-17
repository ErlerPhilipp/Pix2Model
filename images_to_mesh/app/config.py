from pathlib import Path
from flask import Flask

UPLOAD_FOLDER = Path("./data/")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg"}
MAX_FILE_SIZE_IN_MB = 10


def set_flask_configs(app: Flask):
    app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
    app.config['MAX_CONTENT_LENGTH'] = 1024 * 1024 * MAX_FILE_SIZE_IN_MB
    app.config["ALLOWED_EXTENSIONS"] = ALLOWED_EXTENSIONS
