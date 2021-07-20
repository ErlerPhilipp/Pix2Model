#!/bin/sh
# remove all docker images and containers
# needs to be called with sudo
docker stop $(docker ps -a -q)
docker rm $(docker ps -a -q)
docker rmi -f $(docker images -q)