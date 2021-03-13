from pathlib import Path
from typing import List

from flask import Flask, request, render_template, redirect, url_for, flash
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename
from redis import Redis
from rq import Queue
from uuid import uuid4

from .config import set_flask_configs
from image_to_mesh import image_to_mesh

task_queue = Queue(connection=Redis(host="redis"))

app = Flask(__name__)
set_flask_configs(app)


def allowed_extension(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in app.config["ALLOWED_EXTENSIONS"]


@app.route("/", methods=["GET"])
def index():
    return render_template("base.html")


@app.route("/", methods=["POST"])
def file_upload():
    uploaded_files: List[FileStorage] = []

    file: FileStorage
    for file in [request.files.get(f) for f in request.files]:
        if allowed_extension(file.filename):
            uploaded_files.append(file)
        else:
            return "Invalid file extension", 400

    folder: Path = app.config["UPLOAD_FOLDER"] / str(uuid4())
    if not folder.exists():
        folder.mkdir(parents=True)

    processed_filenames: List[str] = []
    for file in uploaded_files:
        processed_filename: str = str(folder / secure_filename(file.filename))
        processed_filenames.append(processed_filename)
        file.save(processed_filename)

    job = task_queue.enqueue(image_to_mesh.process_images, processed_filenames)
    return job.id


@app.errorhandler(413)
def too_large(e):
    return "File is too large", 413


@app.route("/result")
def get_result():
    i = request.args.get("id")
    job = task_queue.fetch_job(i)

    if job is None:
        return f"No job found with id {i}"
    elif job.result is None:
        return f"Job with id {i} not finished yet"
    else:
        return f"Job with id {i} finished with:<br />{job.result}"


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000)
