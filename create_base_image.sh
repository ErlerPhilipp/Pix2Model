#! /bin/sh

set -x

docker rmi -f $(docker images -q --filter=reference=images2mesh_base)
docker build -t images2mesh_base -f Dockerfile.base .