from functools import wraps
from typing import Any

from redis import Redis
from rq import Queue, get_current_job

from images_to_mesh.processing_steps.step_one import process_images
from images_to_mesh.processing_steps.step_two import some_other_processing
from images_to_mesh.app.email.email_config import Order_state
from images_to_mesh.app.email.sendMail import notify_user

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
            print(kwargs)
            print(number)
            if number == NUMBER_OF_STEPS and "mail" in kwargs and not kwargs.get("mail") == "":
                notify_user(current_job.id, kwargs.get("mail"), Order_state.success)
            print("passed")
            return res

        return inner_func
    return decorator


def queue_jobs(input_files: Any, user_email) -> int:
    connection = Redis(host="redis")
    task_queue = Queue(connection=connection)
    j1 = task_queue.enqueue(_step_one, input_files)
    j2 = task_queue.enqueue(_step_two, depends_on=j1, mail=user_email)
    return j2.id


@task(1)
def _step_one(*args, **kwargs):
    return process_images(*args, **kwargs)


@task(2)
def _step_two(*args, **kwargs):
    return some_other_processing(*args, **kwargs)
