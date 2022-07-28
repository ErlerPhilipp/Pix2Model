# Server Maintenance - Pix2Model

This is for our current setup running at `https://netidee.cg.tuwien.ac.at/`. Feel free to adapt it to your needs.

## Deployment

The server is deployed in a directory of the `netidee-server` user. The path is `/home/netidee-server/Server`. In order to have the correct permissions to change files in the deployment, it makes sense to imitate the `netidee-server` user. This can be done with the following command, as long as the current user has sudo capabilities: `sudo su -- netidee-server`.

## Docker

The server runs inside several docker containers that are started using the `docker-compose.yml` file located inside `/home/netidee-server/Server/Repo`. It specifies the following docker containers (also called services inside compose file):

* client-deployed: This container runs a nginx server that fulfills 2 purposes. On one hand, it functions as a web server to host the frontend of the application. On the other hand, it is used as a reverse proxy. It provides access to the backend that runs under the port 3000. However, we want to enforce that our frontend makes calls only to ports 80 or 443. Therefore the proxy forwards every request to `netidee.cg.tuwien.ac.at/backend` to our backend running internally to the correct port.
* backend: The backend handles all incoming requests by receiving all uploaded images and saving them in an internal directory. The request to process these images is put inside a task queue, from which the worker container continuously takes tasks to further process them.
* redis: A key-value store that serves our task queue.
* worker: The processing pipeline is split into separate logical steps and at the beginning of a new request only the first step is queued. The worker takes that step from the queue, saves the intermediate results inside a new subfolder and then puts the request for the next step in the queue. After that, the same worker (or another) takes this new step and does the same thing again until the last step is finished.
* dashboard: Provides an overview of queued, running and failed tasks of the task queue and the ability to cancel these.

The base image for the backend and worker that contains all necessary dependencies including e.g. Colmap. This image is hosted on DockerHub: [https://hub.docker.com/r/image2mesh/image2mesh](https://hub.docker.com/r/image2mesh/image2mesh).


### Docker-Compose

The following `docker compose` commands allow you to manually manage certain containers (services). The commands must be executed from within the directory that contains the `docker-compose.yml` file. Also the flag `--profile deploy` must be appended to each command in order to only interact with the correct services (there is one deprecated service that will not be touched with this flag).

* `docker compose --profile deploy ps`: Displays all docker containers from the configuration file and their current status.
* `docker compose --profile deploy build <service>`: Rebuilds the given service.
* `docker compose --profile deploy up -d <service>`: Starts the given service in detached mode (-d flag is important to run the service in the background). Omitting the service starts all services that are currently not running.
* `docker compose --profile deploy down <service>`: Stops the given service. Omitting the service stops all services.


## Continous Integration

A CI pipeline is in place using Github Actions. It allows that certain actions are executed after a specific trigger has been executed. In this case, after a push has been done to the develop branch, a new action is triggered that connects to the server using ssh and runs the deploy script that does the redeployment.

## [WIP] SSL

Currently the certificates must be refreshed manually following the instructions on https://www.sslforfree.com/. 

In the near future, an automated solution using Certbot (https://certbot.eff.org/) is going to be realized.

## Troubleshooting
### Server restart

In case something went wrong, the easiest way to restart the server is to execute the deploy script. Normally it is triggered by the Github Actions CI Pipeline, but it also works when executed manually. The file is located under `/home/netidee-server/Server/deploy.sh` and once run does the following:

* Kills all running docker containers using the `docker-compose.yml` file.
* Pulls from the develop branch to make sure the local repository is on the current state.
* Rebuilds all docker images (client-deployed, backend, worker, dashboard, redis).
* Starts all docker containers in detached mode using `docker compose up -d`.

In order to run the script, the easiest way is to impersonate the `netidee-server` user (see Section `Deployment`). Then navigate to the Server folder and run `./deploy.sh`. Due to the Shebang at the top of the script, the script should automatically run as a bash script.