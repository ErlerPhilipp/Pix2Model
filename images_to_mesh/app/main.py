from pathlib import Path, PosixPath
from sys import stdout
from time import gmtime
from typing import List

from io import BytesIO
import io
import glob
import re
import os
import zipfile

from flask import Flask, request, render_template, send_file, abort
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename
from redis import Redis
from rq import Queue
from uuid import uuid4

from images_to_mesh.app import process_order
from images_to_mesh.app.config import set_flask_configs

from flask_cors import CORS

import logging


connection = Redis(host="redis")
task_queue = Queue(connection=connection)

app = Flask(__name__)
set_flask_configs(app)
CORS(app)

def setup_logging():
    logging_folder = Path("./backend_log/")
    if not logging_folder.exists():
        os.mkdir(logging_folder)

    logging.basicConfig(encoding="utf-8",
                        level=logging.INFO,
                        format="[%(asctime)s][%(levelname)s] %(message)s",
                        datefmt="%Y-%m-%dT%H:%M:%SZ",
                        handlers=[
                            logging.StreamHandler(stdout),
                            logging.FileHandler(logging_folder / "backend.log")])
    logging.Formatter.converter = gmtime

setup_logging()


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

    job_id: str = str(uuid4())
    app.logger.info(f"File upload started with job id: {job_id}")
    folder: Path = app.config["UPLOAD_FOLDER"] / job_id / "input"
    if not folder.exists():
        folder.mkdir(parents=True)

    processed_filenames: List[str] = []
    for file in uploaded_files:
        processed_filename: str = str(folder / secure_filename(file.filename))
        processed_filenames.append(processed_filename)
        app.logger.info(f"Adding file ({processed_filename}) to job {job_id}")
        file.save(processed_filename)

    user_email = ""
    if "user_email" in request.form:
        app.logger.info("user email: " + request.form.get("user_email"))
        user_email = request.form.get("user_email")

    if "step2" in request.form and not int(request.form.get("step2")):
        app.logger.info(f"Queuing job {job_id} for only step 1")
        return process_order.queue_step_1(processed_filenames, user_email, job_id)
    else:
        app.logger.info(f"Queuing job {job_id} for step 1 and 2")
        return process_order.queue_step_1_2(processed_filenames, user_email, job_id)

# saves files into the output folder in a new version folder
# files to be saved are the visibility file, the pointcloud and the camera poses in the images file
# the type arg specifies which file it is
@app.route("/savefile", methods=["POST"])
def save_file():
    i = request.args.get("id")
    filetype = request.args.get("type")
    filename = ""
    version = ""
    if filetype == "pointVis":
        filename = "points.ply.vis"
        step1_versions = glob.glob(str(PosixPath("/usr/src/app/data") / i / "step1/*"))
        version = re.sub(r'[0-9]+$', lambda x: f"{str(int(x.group())+1).zfill(len(x.group()))}", sorted(step1_versions, reverse=True)[0]) # add +1 to version number
    elif filetype == "pointcloud":
        filename = "points.ply"
        step1_versions = glob.glob(str(PosixPath("/usr/src/app/data") / i / "step1/*"))
        version = re.sub(r'[0-9]+$', lambda x: f"{str(int(x.group())).zfill(len(x.group()))}", sorted(step1_versions, reverse=True)[0]) # don't add +1 to version number
    elif filetype == "images":
        filename = "images.txt"
        step1_versions = glob.glob(str(PosixPath("/usr/src/app/data") / i / "step1/*"))
        version = re.sub(r'[0-9]+$', lambda x: f"{str(int(x.group())).zfill(len(x.group()))}", sorted(step1_versions, reverse=True)[0]) # don't add +1 to version number
    app.logger.info(f"Saving file {filename} with id {i} and version {version}")
    new_pointcloud_file_path = str(PosixPath("/usr/src/app/data") / i / "step1" / version / "output" / filename)
    if(not os.path.exists(str(PosixPath("/usr/src/app/data") / i / "step1" / version / "output"))):
        os.makedirs(str(PosixPath("/usr/src/app/data") / i / "step1" / version / "output"))
    file = request.files['file']
    file.save(new_pointcloud_file_path)
    return new_pointcloud_file_path


@app.route("/reconstructmesh", methods=["POST"])
def reconstruct_mesh():
    i = request.args.get("id")
    app.logger.info(f"Starting step 2 for job with id {i}")
    return process_order.queue_step_2(i)


@app.route("/versions", methods=["GET"])
def get_versions():
    i = request.args.get("id")
    step1_versions = PosixPath("/usr/src/app/data") / i / "step1/v???"
    step2_versions = PosixPath("/usr/src/app/data") / i / "step2/v???"
    step1_step2_versions = glob.glob(str(step1_versions)) + glob.glob(str(step2_versions))
    versions = {'pointcloud': [], 'mesh': []}
    for version in step1_step2_versions:
        if 'step1' in version:
            versions.get('pointcloud').append(version.rsplit('/', 1)[1])
        elif 'step2' in version:
            versions.get('mesh').append(version.rsplit('/', 1)[1])
    
    app.logger.info(f"Retrieving versions for id {i} with the following result: {versions}")
    return versions

## For single ply files
@app.route("/file", methods=["GET"])
def get_file():
    i = request.args.get("id")
    step = request.args.get("step")
    version = request.args.get("version")
    app.logger.info(f"Retrieving file with id {i} from step {step}, version {version}")
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
        result = send_file(buf, as_attachment=True, download_name=filename, mimetype='application/octet-stream')
        result.headers['filename'] = filename
        return result
    abort(404)

## For obj files with texture
@app.route("/files", methods=["GET"])
def get_files():
    i = request.args.get("id")
    step = request.args.get("step")
    version = request.args.get("version")
    if step == None and version == None:
        [filename, file_path, step, version] = get_latest_file(i)

    if step == 'mesh':
        app.logger.info(f"Retrieving file with id {i} from step {step}, version {version}")
        folder_path: Path = PosixPath("/usr/src/app/data") / i / "step2" / version / "output/"
        file_names = ["mesh_textured.obj", "mesh_textured.mtl", "mesh_textured_material_00_map_Kd.jpg"]
        
        if folder_path.is_dir():
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, "w") as zip_file:
                app.logger.info(f"zip file: {Path(folder_path, file_names[0])}")
                app.logger.info(f"zip file: {Path(folder_path, file_names[1])}")
                app.logger.info(f"zip file: {Path(folder_path, file_names[2])}")
                zip_file.write(Path(folder_path, file_names[0]), file_names[0])
                zip_file.write(Path(folder_path, file_names[1]), file_names[1])
                zip_file.write(Path(folder_path, file_names[2]), file_names[2])
            
            zip_buffer.seek(0)

            result = send_file(zip_buffer, download_name="object_files.zip", as_attachment=True, mimetype="application/zip")
            return result
        else:
            app.logger.info(f"Can't zip folder {folder_path}, is not a folder")
    else:   # step == pointcloud
        app.logger.info(f"Retrieving file with id {i} from step {step}, version {version}")
        folder_path: Path = PosixPath("/usr/src/app/data") / i / "step1" / version / "output/"
        file_names = ["points.ply", "images.txt"]
        if folder_path.is_dir():
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, "w") as zip_file:
                app.logger.info(f"zip file: {Path(folder_path, file_names[0])}")
                app.logger.info(f"zip file: {Path(folder_path, file_names[1])}")
                #app.logger.info(f"zip file: {Path(folder_path, file_names[2])}")
                zip_file.write(Path(folder_path, file_names[0]), file_names[0])
                zip_file.write(Path(folder_path, file_names[1]), file_names[1])
                #zip_file.write(Path(folder_path, file_names[2]), file_names[2])
            zip_buffer.seek(0)

            result = send_file(zip_buffer, download_name="pointcloud_files.zip", as_attachment=True, mimetype="application/zip")
            return result
        else:
            app.logger.info(f"Can't zip folder {folder_path}, is not a folder")
    abort(404)

@app.route("/filestatus", methods=["GET"])
def get_status():
    i = request.args.get("id")
    step = request.args.get("step")
    version = request.args.get("version")
    app.logger.info(f"Retrieving status of job with id {i} from step {step}, version {version}")
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
    app.logger.info(f"Aborting job {job_id}")
    result = process_order.abort_job(job_id)
    return "", 200 if result else 500

@app.route("/logfile", methods=["GET"])
def get_log_file():
    i = request.args.get("id")
    step = request.args.get("step")
    version = request.args.get("version")
    app.logger.info(f"Retrieving log file of job with id {i} from step {step}, version {version}")
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
    step2_versions = glob.glob(str(PosixPath("/usr/src/app/data") / i / "step2/**/output/mesh_textured.obj"))
    
    if step2_versions:
        file_step_2: Path = PosixPath(max(step2_versions))
        if file_step_2.is_file():
            filename = i+'_mesh.ply'
            version = max(glob.glob(str(PosixPath("/usr/src/app/data") / i / "step2/v???"))).rsplit('/', 1)[1]
            return [filename, file_step_2, "mesh", version]
    if step1_versions:
        file_step_1: Path = PosixPath(max(step1_versions))
        if file_step_1.is_file():
            filename = i+'_pointcloud.ply'
            version = max(glob.glob(str(PosixPath("/usr/src/app/data") / i / "step1/v???"))).rsplit('/', 1)[1]
            return [filename, file_step_1, "pointcloud", version]
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
