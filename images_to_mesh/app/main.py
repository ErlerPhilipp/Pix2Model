from pathlib import Path, PosixPath
from typing import List

from io import BytesIO
import glob
import re
import os

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

    if "step2" in request.form and not int(request.form.get("step2")):
        return process_order.queue_step_1(processed_filenames, user_email)
    else:
        return process_order.queue_step_1_2(processed_filenames, user_email)


@app.route("/savefile", methods=["POST"])
def save_file():
    i = request.args.get("id")
    step1_versions = glob.glob(str(PosixPath("/usr/src/app/data") / i / "step1/*"))
    version = re.sub(r'[0-9]+$', lambda x: f"{str(int(x.group())+1).zfill(len(x.group()))}", sorted(step1_versions, reverse=True)[0])
    new_pointcloud_file_path = str(PosixPath("/usr/src/app/data") / i / "step1" / version / "output/points.ply")
    os.makedirs(str(PosixPath("/usr/src/app/data") / i / "step1" / version / "output"))
    file = request.files['file']
    file.save(new_pointcloud_file_path)
    return new_pointcloud_file_path


@app.route("/reconstructmesh", methods=["POST"])
def reconstruct_mesh():
    i = request.args.get("id")
    return process_order.queue_step_2(i)


@app.route("/versions", methods=["GET"])
def get_versions():
    i = request.args.get("id")
    step1_versions = PosixPath("/usr/src/app/data") / i / "step1/*"
    step2_versions = PosixPath("/usr/src/app/data") / i / "step2/*"
    step1_step2_versions = glob.glob(str(step1_versions)) + glob.glob(str(step2_versions))
    versions = {'pointcloud': [], 'mesh': []}
    for version in step1_step2_versions:
        if 'step1' in version:
            versions.get('pointcloud').append(version.rsplit('/', 1)[1])
        elif 'step2' in version:
            versions.get('mesh').append(version.rsplit('/', 1)[1])
    return versions


@app.route("/file", methods=["GET"])
def get_file():
    i = request.args.get("id")
    step = request.args.get("step")
    version = request.args.get("version")
    if step == None or version == None:
        [filename, file_path, step, version] = get_latest_file(i)
    elif step == 'mesh':
        file_path: Path = PosixPath("/usr/src/app/data") / i / "step2" / version / "output/points_out.ply"
        filename = i+'_'+step+'.ply'
    else:
        file_path: Path = PosixPath("/usr/src/app/data") / i / "step1" / version / "output/points.ply"
        filename = i+'_'+step+'.ply'
    
    if file_path and file_path.is_file():
        filename = i+'_'+step+'.ply'
        with open(file_path, 'rb') as fh:
            buf = BytesIO(fh.read())
            buf.seek(0)
        result = send_file(buf, as_attachment=True, attachment_filename=filename, mimetype='application/octet-stream')
        result.headers['filename'] = filename
        return result
    abort(404)


@app.route("/filestatus", methods=["GET"])
def get_status():
    i = request.args.get("id")
    step = request.args.get("step")
    version = request.args.get("version")
    # Check if file exists
    if step == None or version == None:
        [filename, file_path, step, version] = get_latest_file(i)
    elif step == 'mesh':
        file_path: Path = PosixPath("/usr/src/app/data") / i / "step2" / version / "output/points_out.ply"
    else:
        file_path: Path = PosixPath("/usr/src/app/data") / i / "step1" / version / "output/points.ply"
    if file_path and file_path.is_file():
        return i, 200
    # Check if job for file exists
    job = task_queue.fetch_job(i)
    if job and job.result is None:
        return i, 201
    # Read error from error.log
    error_file_path = None
    if step == None or version == None:
        error_files_step_1 = glob.glob(str(PosixPath("/usr/src/app/data") / i / "step1/**/error.log"))
        error_files_step_2 = glob.glob(str(PosixPath("/usr/src/app/data") / i / "step2/**/error.log"))
        if error_files_step_2:
            error_file_path: Path = PosixPath(max(error_files_step_2))
        elif error_files_step_1:
            error_file_path: Path = PosixPath(max(error_files_step_1))
    elif step == 'mesh':
        error_file_path: Path = PosixPath("/usr/src/app/data") / i / "step2" / version / "error.log"
    elif step == 'pointcloud':
        error_file_path: Path = PosixPath("/usr/src/app/data") / i / "step1" / version / "error.log"
    if error_file_path and error_file_path.is_file():
        with open(error_file_path, "r") as file:
            first_line_error_log = file.readline()
        return first_line_error_log, 400
    return i, 404

@app.route("/abort", methods=["POST"])
def abort_job():
    job_id = request.args.get("id")
    result = process_order.abort_job(job_id)
    return "", 200 if result else 500

@app.route("/logfile", methods=["GET"])
def get_log_file():
    i = request.args.get("id")
    step = request.args.get("step")
    version = request.args.get("version")
    file_path = None
    if step == None or version == None:
        log_files_step_1 = glob.glob(str(PosixPath("/usr/src/app/data") / i / "step1/**/log.txt"))
        log_files_step_2 = glob.glob(str(PosixPath("/usr/src/app/data") / i / "step2/**/log.txt"))
        if log_files_step_2:
            file_path: Path = PosixPath(max(log_files_step_2))
        elif log_files_step_1:
            file_path: Path = PosixPath(max(log_files_step_1))
    elif step == 'mesh':
        file_path: Path = PosixPath("/usr/src/app/data") / i / "step2" / version / "log.txt"
    else:
        file_path: Path = PosixPath("/usr/src/app/data") / i / "step1" / version / "log.txt"
    if file_path and file_path.is_file():
        with open(file_path, "r") as f:
            content = f.read()
        result = content
        return result
    return None


def get_latest_file(i):
    step1_versions = glob.glob(str(PosixPath("/usr/src/app/data") / i / "step1/**/output/points.ply"))
    step2_versions = glob.glob(str(PosixPath("/usr/src/app/data") / i / "step2/**/output/points_out.ply"))
    
    if step2_versions:
        file_step_2: Path = PosixPath(max(step2_versions))
        if file_step_2.is_file():
            filename = i+'_mesh.ply'
            return [filename, file_step_2, "mesh", sorted(step2_versions, reverse=True)[0]]
    if step1_versions:
        file_step_1: Path = PosixPath(max(step1_versions))
        if file_step_1.is_file():
            filename = i+'_pointcloud.ply'
            return [filename, file_step_1, "pointcloud", sorted(step1_versions, reverse=True)[0]]
    return [None, None, None, None]


@app.route("/result")
def get_result():
    '''
    SCHNITTSTELLE DEPRECATED?
    '''
    i = request.args.get("id")
    return get_job_status(i)


def get_job_status(i):
    '''
    DEPRECATED?
    '''
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
