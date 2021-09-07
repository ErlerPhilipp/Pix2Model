# Images2Mesh
Images2Mesh Web funded by Netidee

## Colmap Prerequisites

In order to use Colmap a NVIDIA gpu must be present. Install the "nvidia-container-toolkit" before building the project:

```bash
# Add the package repositories
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list

# Install nvidia-container-toolkit
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker

# Check that it worked!
docker run --gpus all nvidia/cuda:10.2-base nvidia-smi
```

The [NVIDIA CUDA toolkit](https://developer.nvidia.com/cuda-downloads) must be installed on the host system.

Check your CUDA installation with 
```bash
nvidia-smi
```
If a CUDA Version >= 11.4 is reported you are good to go.

## Docker Setup

The project can be deployed using docker and docker-compose. The architecture consists of the following services that can be found in the docker-compose.yml:

- web: Contains the application server written in python using flask
- dashboard: Monitoring of the task queue via connection to redis server
- redis: Database/Caching server used as host for the task queue
- worker: Consumer for task queue written in python includes installation of CUDA and [Colmap](https://colmap.github.io/) 

To start the whole setup the "start.sh" script can be used. It starts each service (including the worker) exactly once. Further information on how to use docker-compose can be found in the [official documentation](https://docs.docker.com/compose/reference/).

### Local Data Folder

During the runtime of the project, the data folder containing the uploaded images is mounted to the host system. The local path on the host must be specified using an environment variable. This can be easily done with the help of docker using an environment file. Place a file called .env in the same directory as the docker-compose.yml and put in each line a key-value pair separated with a "=" sign (more information in the [official documentation](https://docs.docker.com/compose/env-file/)). The following variables can be set in the current setup:

- UPLOAD_FOLDER: Path to the locally mounted data folder
- RQ_DASHBOARD_USERNAME: Username required for access to the dashboard
- RQ_DASHBOARD_PASSWORD: Password required for access to the dashboard 

### Folder structure

The structure of the data folder is very flexible. There are only 2 fixed folders:

- "UUID": for new file uploads
  - input: initial uploaded file set

Once a user starts a new upload of images, a folder named after a random UUID is created. Inside this folder, another folder called "input" is created that contains the uploaded images. The paths to these images is then passed as argument to the first step in the processing pipeline. How each further step uses this folder is up to them, however it makes sense that each step creates its own folder for putting intermediate results.

## Integration of Processing Steps

To integrate a step of the processing pipeline into this project use the process_order.py module. In there declare a wrapper function that looks like this:

```python
@task(1)
def _step_one(*args, **kwargs):
    return processing_function(*args, **kwargs)
```

The task decorate should receive the ordinal of the step in the pipeline. In this example the "processing_function" should be replaced with the processing function, which is supposed to do the work. For the sake of keeping the folder structure clean, the function should be put inside the "processing_steps" package and if multiple modules/files are necessary inside its own sub-package. Finally the processing step must be registered in the "queue_jobs" function:

```python
def queue_jobs(input_files: Any) -> int:
    connection = Redis(host="redis")
    task_queue = Queue(connection=connection)
    j1 = task_queue.enqueue(_step_one, input_files)
    j2 = task_queue.enqueue(_step_two, depends_on=j1)
    return j2.id
```

Here the "input_files" argument contains a list of the uploaded images and their paths. This argument should always be the fixed argument for the first step in the queue. For every other step, the return value of the previous step is automatically the input for the next one. In order to ensure that each consecutive step waits for the previous one, the "depends_on" keyword argument should be used.

## Point Cloud Reconstruction

The first processing step performs a point cloud reconstruction from input images using Colmap. After the step completes, it provides two outputs:

- A points.ply file containing the point cloud data (XYZ positions and RGB colors of each point)
- A log.txt file containing the log of the reconstruction
