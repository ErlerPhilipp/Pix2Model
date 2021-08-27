FROM images2mesh_base:latest

###########################################################################
# Create final image
###########################################################################

EXPOSE 5000/tcp

WORKDIR /usr/src/app

COPY Pipfile* ./

RUN pipenv install --dev

COPY . .

RUN mkdir data

ENV PYTHONPATH "/usr/src/app"
ENV FLASK_APP "images_to_mesh.app.main"

CMD ["pipenv" ,"run" ,"flask", "run", "--host=0.0.0.0"]
