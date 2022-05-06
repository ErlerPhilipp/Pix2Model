import glob

from pathlib import PosixPath

from functools import wraps
from typing import Any

from redis import Redis
from rq import Queue, get_current_job
from rq.command import send_stop_job_command
from pathlib import Path

from images_to_mesh.app.email.email_config import Order_state
from images_to_mesh.app.email.sendMail import notify_user
from images_to_mesh.processing_steps.sfm.reconstruct import reconstruct_with_colmap, ReconstructionError
from images_to_mesh.processing_steps.mesh_reconstruction.mesh_reconstruction import process_clouds

NUMBER_OF_STEPS = 2

def task(number: int):
    def decorator(func):
        @wraps(func)
        def inner_func(*args, **kwargs):
            print(f"Starting Step {number}!", flush=True)
            connection = Redis(host="redis")
            task_queue = Queue(connection=connection)
            current_job = get_current_job(connection)
            first_job = current_job.dependency
            if first_job is not None:
                first_job_result = task_queue.fetch_job(first_job.id).result
                if len(args) == 0:
                    args = (first_job_result,)
            res = func(*args, **kwargs)
            print(f"Finished Step {number}!", flush=True)
            if number == NUMBER_OF_STEPS and "mail" in current_job.meta and not current_job.meta['mail'] == "":
                notify_user(current_job.id, current_job.meta['mail'], Order_state.success)
            return res

        return inner_func

    return decorator

def abort_job(job_id) -> bool:
    connection = Redis(host="redis")
    try:
        send_stop_job_command(connection, job_id)
    except Exception:
        return False

    return True


def queue_step_1(input_files: Any, user_email, job_id: str = None) -> int:
    connection = Redis(host="redis")
    task_queue = Queue(connection=connection, default_timeout=18000)
    j1 = task_queue.enqueue(_structure_from_motion, input_files, job_id=job_id)
    j1.meta['mail'] = user_email
    j1.save_meta()
    print(str(Path(input_files[0]).parent.parent), flush=True)
    return str(Path(input_files[0]).parent.parent)


def queue_step_1_2(input_files: Any, user_email, job_id: str = None) -> int:
    connection = Redis(host="redis")
    task_queue = Queue(connection=connection, default_timeout=18000)
    j1 = task_queue.enqueue(_structure_from_motion, input_files, job_id=job_id)
    j2 = task_queue.enqueue(_mesh_reconstruction, depends_on=j1)
    j1.meta['mail'] = user_email
    j1.save_meta()
    j2.meta['mail'] = user_email
    j2.save_meta()
    return str(Path(input_files[0]).parent.parent)


def queue_step_2(iid, job_id: str = None):
    connection = Redis(host="redis")
    task_queue = Queue(connection=connection, default_timeout=18000)
    step1_versions = glob.glob(str(PosixPath("/usr/src/app/data") / iid / "step1/*"))
    pointcloud_file = str(PosixPath("/usr/src/app/data") / iid / "step1" / sorted(step1_versions, reverse=True)[0] / "output/points.ply")
    j2 = task_queue.enqueue(_mesh_reconstruction_without_dependency, path=pointcloud_file, job_id=job_id)
    return pointcloud_file


@task(1)
def _structure_from_motion(*args, **kwargs):
    # Error handling here for now
    try:
        return reconstruct_with_colmap(*args, **kwargs)
    except ReconstructionError as e:
        print(e.msg)


@task(2)
def _mesh_reconstruction(*args, **kwargs):
    connection = Redis(host="redis")
    current_job = get_current_job(connection)
    first_job_result = current_job.dependency.result
    return process_clouds(first_job_result)


@task(2)
def _mesh_reconstruction_without_dependency(*args, **kwargs):
    pointcloud_file = kwargs.get('path')
    print('pointcloud_file:', pointcloud_file, flush=True)
    return process_clouds(pointcloud_file)
