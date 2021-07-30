from functools import wraps
from typing import Any

from redis import Redis
from rq import Queue, get_current_job

from images_to_mesh.processing_steps.step_one import process_images
from images_to_mesh.processing_steps.step_two import some_other_processing
from images_to_mesh.processing_steps.sfm.reconstruct import reconstruct_with_colmap


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
            return res

        return inner_func

    return decorator


def queue_jobs(input_files: Any) -> int:
    connection = Redis(host="redis")
    task_queue = Queue(connection=connection, default_timeout=3600)
    j1 = task_queue.enqueue(_structure_from_motion, input_files)
    #j1 = task_queue.enqueue(_step_one, input_files)
    j2 = task_queue.enqueue(_step_two, depends_on=j1)
    return j2.id


#@task(1)
#def _step_one(*args, **kwargs):
#    return process_images(*args, **kwargs)

@task(1)
def _structure_from_motion(*args, **kwargs):
    return reconstruct_with_colmap(*args, **kwargs)

@task(2)
def _step_two(*args, **kwargs):
    return some_other_processing(*args, **kwargs)
