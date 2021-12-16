from pathlib import Path, PosixPath
from typing import List

from io import BytesIO

from flask import Flask, request, render_template, send_file, abort
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename
from redis import Redis
from rq import Queue
from uuid import uuid4

from images_to_mesh.app import process_order
from images_to_mesh.app.config import set_flask_configs

from flask_cors import CORS


connection = Redis(host="redis")
task_queue = Queue(connection=connection)

app = Flask(__name__)
set_flask_configs(app)
CORS(app)


def allowed_extension(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in app.config["ALLOWED_EXTENSIONS"]


@app.route("/", methods=["POST"])
def file_upload():
    uploaded_files: List[FileStorage] = []

    file: FileStorage
    for file in [request.files.get(f) for f in request.files]:
        if allowed_extension(file.filename):
            uploaded_files.append(file)
        else:
            return "Invalid file extension", 400

    folder: Path = app.config["UPLOAD_FOLDER"] / str(uuid4()) / "input"
    if not folder.exists():
        folder.mkdir(parents=True)

    processed_filenames: List[str] = []
    for file in uploaded_files:
        processed_filename: str = str(folder / secure_filename(file.filename))
        processed_filenames.append(processed_filename)
        file.save(processed_filename)

    user_email = ""
    if "user_email" in request.form:
        print("user email: ", request.form.get("user_email"), flush=True)
        user_email = request.form.get("user_email")

    steps = [1, 2]
    if "step2" in request.form and not int(request.form.get("step2")):
        print("step 2 won't be processed...", flush=True)
        steps = [1]
    
    return process_order.queue_jobs(processed_filenames, user_email, steps)


@app.route("/result")
def get_result():
    i = request.args.get("id")
    return get_job_status(i)


@app.route("/latestfile", methods=["GET"])
def get_latest_file():
    i = request.args.get("id")
    file_step_1: Path = PosixPath("/usr/src/app/data") / i / "step1/output/points.ply"
    file_step_2: Path = PosixPath("/usr/src/app/data") / i / "step2/output/points_out.ply"
    if file_step_2.is_file():
        filename = i+'_step2.ply'
        with open(file_step_2, 'rb') as fh:
            buf = BytesIO(fh.read())
            buf.seek(0)
        result = send_file(buf, as_attachment=True, attachment_filename=filename, mimetype='application/octet-stream')
        result.headers['filename'] = filename
        return result
    if file_step_1.is_file():
        filename = i+'_step1.ply'
        with open(file_step_1, 'rb') as fh:
            buf = BytesIO(fh.read())
            buf.seek(0)
        result = send_file(buf, as_attachment=True, attachment_filename=filename, mimetype='application/octet-stream')
        result.headers['filename'] = filename
        return result
    abort(404)


def get_job_status(i):
    job = task_queue.fetch_job(i)
    if job is None:
        return f"No job found with id {i}"
    elif job.result is None:
        return f"Job with id {i} not finished yet"
    else:
        return f"Job with id {i} finished with:<br />{job.result}"


@app.errorhandler(413)
def too_large(e):
    return "File is too large", 413


@app.errorhandler(404)
def file_not_found(error):
   return "File not found", 404


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000)
