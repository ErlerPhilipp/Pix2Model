#!/bin/sh
set -x

# create baseimage
if [ -z $(docker images -q --filter=reference=images2mesh_base) ]
then
    ./create_base_image.sh
fi

# remove old docker images and containers
docker stop $(docker ps -a -q --filter ancestor=images2mesh_client)
docker stop $(docker ps -a -q --filter ancestor=images2mesh_worker)
docker stop $(docker ps -a -q --filter ancestor=images2mesh_web)
docker stop $(docker ps -a -q --filter ancestor=images2mesh_dashboard)
docker rm $(docker ps -a -q --filter ancestor=images2mesh_client)
docker rm $(docker ps -a -q --filter ancestor=images2mesh_worker)
docker rm $(docker ps -a -q --filter ancestor=images2mesh_web)
docker rm $(docker ps -a -q --filter ancestor=images2mesh_dashboard)
docker rmi -f $(docker images -q --filter=reference=images2mesh_client)
docker rmi -f $(docker images -q --filter=reference=images2mesh_worker)
docker rmi -f $(docker images -q --filter=reference=images2mesh_web)
docker rmi -f $(docker images -q --filter=reference=images2mesh_dashboard)
docker rmi $(docker images -f dangling=true -q)

# build new images and start
docker build -t images2mesh_base -f Dockerfile.base .
docker-compose up