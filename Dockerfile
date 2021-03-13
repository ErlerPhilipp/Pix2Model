FROM python:3.9-alpine
EXPOSE 12345/tcp

RUN pip install pipenv

WORKDIR /usr/src/app

COPY Pipfile ./
COPY Pipfile.lock ./

RUN pipenv install

COPY . .

ENV PYTHONPATH "${PYTHONPATH}:."

CMD ["pipenv" ,"run" ,"python", "app/main.py"]