FROM image2mesh/image2mesh:open-mvs
###########################################################################
# Create final image
###########################################################################

EXPOSE 5000/tcp

WORKDIR /usr/src/app

COPY Pipfile* ./

RUN pipenv install --dev

COPY . .

RUN if ! test -d data; then \
      mkdir data; \
    fi

ENV PYTHONPATH "/usr/src/app"
ENV FLASK_APP "images_to_mesh.app.main"

CMD ["pipenv" ,"run" ,"flask", "run", "--host=0.0.0.0"]
