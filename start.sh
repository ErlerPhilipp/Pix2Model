#!/bin/bash
set -x
shopt -s extglob

# remove old docker images and containers
docker stop $(docker ps -a -q --filter ancestor=images2mesh_@(client|worker|web|dashboard))
docker rm $(docker ps -a -q --filter ancestor=images2mesh_@(client|worker|web|dashboard))
docker rmi -f $(docker images -q --filter=reference=images2mesh_@(client|worker|web|dashboard))
docker rmi $(docker images -f dangling=true -q)

# build new images and start
docker-compose up