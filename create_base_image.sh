#! /bin/bash

set -x

docker rmi -f $(docker images -q --filter=reference=images2mesh_base)
docker rmi $(docker images -f dangling=true -q)
docker build -t images2mesh/images2mesh:base -f Dockerfile.base .
