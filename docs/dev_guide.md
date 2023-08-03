# Development Guide

This guide is meant for people who want to modify this project or even create a whole new processing pipeline.
Please make sure that the system is [set up](setup.md) correctly.
Also consider the [development environment setup](dev_setup.md) for better testing.


## Photogrammetry Pipeline

We use publicly available software to create a 3D model from uploaded images.
The pipeline consists of the following steps:
- COLMAP for Structure from Motion and Multi-View Stereo
- PyMeshlab (Screened Poisson Surface Reconstruction) for meshing
- [WIP] OpenMVS for texturing

So far, [COLMAP](https://colmap.github.io/) has shown the best results for our use cases with 
acceptable computation times. 
[Meshroom](https://alicevision.org/#meshroom) is a viable alternative. 
However, our tests indicate lower robustness to low-quality inputs, which is likely in our application.
This first processing step performs outputs:
- A `points.ply` file containing the point cloud data (XYZ positions and RGB colors of each point)
- A log.txt file containing the log of the reconstruction

We chose Screened Poisson Surface Reconstruction for meshing because its boundary condition enforces the
closing of holes. This again increases robustness to low-quality inputs compared 
to e.g. Poisson Surface Reconstruction and other reconstruction methods.
This processing step outputs a `mesh.ply` file containing the mesh data (vertices and faces) with vertex colors.

The texturing step is currently being implemented. It will replace the current vertex colors, 
which lose quality quickly when simplifying the mesh.


## Processing Folder Structure

Uploaded images are stored in `data/[UUID]/input`, where UUID is a random unique identifier for each job. 
The paths to these images is passed as argument to the first step in the processing pipeline. 

How each further step uses this folder is up to them, 
however it makes sense that each step creates its own folder for putting intermediate results.
In our case, `data/[UUID]/step1` and `data/[UUID]/step2` correspond to the outputs of 
COLMAP and Poisson Rec, respectively.


## Server Data Folder

During the runtime of the project, the data folder containing the uploaded images is mounted to the host system. 
The local path on the host must be specified using an environment variable. 
This can be easily done with the help of docker using an environment file. 
Place a file called `.env` in the same directory as the docker-compose.yml and 
put in each line a key-value pair separated with a "=" sign 
(more information in the [official documentation](https://docs.docker.com/compose/env-file/)). 

The following variables can be set in the current setup:
- UPLOAD_FOLDER: Path to the locally mounted data folder
- RQ_DASHBOARD_USERNAME: Username required for access to the dashboard
- RQ_DASHBOARD_PASSWORD: Password required for access to the dashboard 
- SSL_CERT_FOLDER: Path to the SLL certificate needed to run the server
- BACKEND_LOG: Path to the backend log


## Docker

The server runs inside several docker containers that are started using the `docker-compose.yml` 
file located inside `/home/netidee-server/Server/Repo`. It specifies the following docker containers 
(also called services inside compose file):
* client-deployed: This container runs an nginx server that fulfills 2 purposes. On one hand, it functions as a web server to host the frontend of the application. On the other hand, it is used as a reverse proxy. It provides access to the backend that runs under the port 3000. However, we want to enforce that our frontend makes calls only to ports 80 or 443. Therefore, the proxy forwards every request to `netidee.cg.tuwien.ac.at/backend` to our backend running internally to the correct port.
* backend: The backend handles all incoming requests by receiving all uploaded images and saving them in an internal directory. The request to process these images is put inside a task queue, from which the worker container continuously takes tasks to further process them.
* redis: A key-value store that serves as our task queue.
* worker: The processing pipeline is split into separate logical steps and at the beginning of a new request only the first step is queued. The worker takes that step from the queue, saves the intermediate results inside a new sub-folder and then puts the request for the next step in the queue. After that, the same worker (or another) takes this new step and does the same thing again until the last step is finished.
* dashboard: Provides an overview of queued, running and failed tasks of the task queue and the ability to cancel these.

The base image for the backend and worker that contains all necessary dependencies including e.g. COLMAP. This image is hosted on DockerHub: [https://hub.docker.com/r/image2mesh/image2mesh](https://hub.docker.com/r/image2mesh/image2mesh).

Run the `start.sh` to start each service (including the worker) exactly once. 
Further information on how to use docker-compose can be found in the 
[official documentation](https://docs.docker.com/compose/reference/).


## Integration of Processing Steps

To integrate a step of the processing pipeline into this project use the process_order.py module. In there declare a wrapper function that looks like this:

```python
@task(1)
def _step_one(*args, **kwargs):
    return processing_function(*args, **kwargs)
```

The task decorate should receive the ordinal of the step in the pipeline. In this example the "processing_function" should be replaced with the processing function, which is supposed to do the work. For the sake of keeping the folder structure clean, the function should be put inside the "processing_steps" package and if multiple modules/files are necessary inside its own sub-package. Finally, the processing step must be registered in the "queue_jobs" function:

```python
def queue_jobs(input_files: Any) -> int:
    connection = Redis(host="redis")
    task_queue = Queue(connection=connection)
    j1 = task_queue.enqueue(_step_one, input_files)
    j2 = task_queue.enqueue(_step_two, depends_on=j1)
    return j2.id
```

Here, the "input_files" argument contains a list of the uploaded images and their paths. 
This argument should always be the fixed argument for the first step in the queue. 
For every other step, the return value of the previous step is automatically the input for the next one. 
In order to ensure that each consecutive step waits for the previous one, 
the "depends_on" keyword argument should be used.


## Experimental Features

### OpenMVS (WIP)

To start the setup with open-mvs support modify the first line in the *Dockerfile* and change it 
from `FROM image2mesh/image2mesh:base` to `FROM image2mesh/image2mesh:open-mvs`. 
Then build the *Dockerfile.mvs* image inside the project root folder with this 
command `docker build --file Dockerfile.mvs --tag image2mesh/image2mesh:open-mvs .` 
and then start the setup with the "start.sh" script.
The open_mvs binaries should be located in "/root/openMVS_build/bin".

