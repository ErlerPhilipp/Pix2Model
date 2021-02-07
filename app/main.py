from flask import Flask, request
from redis import Redis
from rq import Queue

from image_to_mesh import image_to_mesh

q = Queue(connection=Redis())

app = Flask(__name__)


@app.route("/queue")
def queue() -> str:
    i = request.args.get("input")
    try:
        n = int(i)
        job = q.enqueue(image_to_mesh.do_work, n)
        return f"Enqueued job with id {job.id}"
    except ValueError:
        return "Input must be a number"


@app.route("/result")
def get_result():
    i = request.args.get("id")
    job = q.fetch_job(i)

    if job is None:
        return f"No job found with id {i}"
    elif job.result is None:
        return f"Job with id {i} not finished yet"
    else:
        return f"Job with id {i} finished with {job.result}"


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=1234)
