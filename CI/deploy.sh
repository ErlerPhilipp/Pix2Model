. ./vars
cd $PATH_TO_DIR
cd ./$REPO_NAME
docker-compose stop
yes | docker-compose rm
git pull
git checkout $NAME_OF_PUB_BRANCH
docker-compose build
docker-compose up -d