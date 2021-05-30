FROM python:3.9-alpine
EXPOSE 5000/tcp

RUN pip install pipenv

WORKDIR /usr/src/app

COPY Pipfile ./
COPY Pipfile.lock ./

RUN pipenv install --dev

COPY . .

RUN mkdir data

ENV PYTHONPATH "/usr/src/app"
ENV FLASK_APP "images_to_mesh.app.main"

CMD ["pipenv" ,"run" ,"flask", "run", "--host=0.0.0.0"]