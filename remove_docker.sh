#!/bin/sh
# remove all docker images and containers
docker stop $(docker ps -a -q)
docker rm $(docker ps -a -q)
docker rmi -f $(docker images -q --filter=reference='images2mesh_[dw]*')