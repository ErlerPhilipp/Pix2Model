FROM images2mesh_base:latest

###########################################################################
# Create final image
###########################################################################

RUN apt-get update && apt-get -y install \
    libopengl-dev

EXPOSE 5000/tcp

WORKDIR /usr/src/app

COPY Pipfile ./
COPY Pipfile.lock ./
COPY test_data /test_data

RUN pipenv install --dev

COPY . .

RUN mkdir data

ENV PYTHONPATH "/usr/src/app"
ENV FLASK_APP "images_to_mesh.app.main"

CMD ["pipenv" ,"run" ,"flask", "run", "--host=0.0.0.0"]
