. ./vars
cd $PATH_TO_DIR
rm -fr $REPO_NAME
git clone $REPO_SSH_ID
cd ./$REPO_NAME
git checkout $NAME_OF_PUB_BRANCH
docker-compose build
docker-compose up -d