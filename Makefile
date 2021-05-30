.PHONY: all build export start start_without_worker start_worker stop clean

all: build start

build:
	docker-compose build

start:
	docker-compose up

start_without_worker:
	docker-compose up -d redis && docker-compose up -d web && docker-compose up -d dashboard

start_worker:
	docker-compose up -d worker

stop:
	docker-compose kill

clean:
	docker-compose down
	docker container prune -f
	docker image prune -f