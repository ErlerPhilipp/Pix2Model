FROM python:3.9-alpine
EXPOSE 5000/tcp

RUN pip install pipenv

WORKDIR /usr/src/app

COPY Pipfile ./
COPY Pipfile.lock ./

RUN pipenv install --dev

COPY . .

RUN mkdir data

ENV PYTHONPATH "${PYTHONPATH}:."
ENV FLASK_APP "app.main"

CMD ["pipenv" ,"run" ,"flask", "run", "--host=0.0.0.0"]