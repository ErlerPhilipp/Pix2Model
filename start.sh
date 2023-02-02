#!/bin/bash

# remove old docker images and containers
echo "Stopping containers ..."
docker stop $(docker ps -a -q --filter ancestor=images2mesh_client) &>/dev/null
docker stop $(docker ps -a -q --filter ancestor=images2mesh_worker) &>/dev/null
docker stop $(docker ps -a -q --filter ancestor=images2mesh_backend) &>/dev/null
docker stop $(docker ps -a -q --filter ancestor=images2mesh_dashboard) &>/dev/null
echo "Removing containers ..."
docker rm $(docker ps -a -q --filter ancestor=images2mesh_client) &>/dev/null
docker rm $(docker ps -a -q --filter ancestor=images2mesh_worker) &>/dev/null
docker rm $(docker ps -a -q --filter ancestor=images2mesh_backend) &>/dev/null
docker rm $(docker ps -a -q --filter ancestor=images2mesh_dashboard) &>/dev/null
echo "Removing images ..."
docker rmi -f $(docker images -q --filter=reference=images2mesh_client) &>/dev/null
docker rmi -f $(docker images -q --filter=reference=images2mesh_worker) &>/dev/null
docker rmi -f $(docker images -q --filter=reference=images2mesh_backend) &>/dev/null
docker rmi -f $(docker images -q --filter=reference=images2mesh_dashboard) &>/dev/null
echo "Removing dangling images ..."
docker rmi $(docker images -f dangling=true -q) &>/dev/null

# build new images and start
echo "Starting Images2Mesh ..."
docker-compose --profile deploy up --build
