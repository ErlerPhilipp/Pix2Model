# Troubleshooting

This guide is meant for our recommended [setup](setup.md).


## Server restart

Sometimes, the server runs into an error and stops working. 
An easy fix that solves surprisingly many problems is to simply restart the server.

Impersonate the server user:
```bash
sudo su -- netidee-server
```
and run the deploy script:
```bash
cd /home/netidee-server/Server/
bash deploy.sh
```

It might even be necessary to reboot the host machine:
```bash
sudo reboot
```


## GPU not found anymore

We have once seen the case that a GPU stopped working and did not appear anymore in nvidia-smi. 
This was likely caused by a hardware failure. Rebooting helped temporarily.


## Docker Compose

The following `docker compose` commands allow you to manually manage certain containers (services). The commands must be executed from within the directory that contains the `docker-compose.yml` file. Also, the flag `--profile deploy` must be appended to each command in order to only interact with the correct services (there is one deprecated service that will not be touched with this flag).

* `docker compose --profile deploy ps`: Displays all docker containers from the configuration file and their current status.
* `docker compose --profile deploy build <service>`: Rebuilds the given service.
* `docker compose --profile deploy up -d <service>`: Starts the given service in detached mode (-d flag is important to run the service in the background). Omitting the service starts all services that are currently not running.
* `docker compose --profile deploy down <service>`: Stops the given service. Omitting the service stops all services.


## Logging

Backend logs are stored in the `BACKEND_LOG` folder as specified in the `.env` file.
Each processing step should save its log in its output folder.


## Problem not solved?

Please open an issue on GitHub, and we will try to help you and expand this guide.
