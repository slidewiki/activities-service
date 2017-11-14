#!/bin/bash

docker login -u="$DOCKER_USERNAME" -p="$DOCKER_PASSWORD"
docker build --build-arg BUILD_ENV=travis -t slidewiki/activitiesservice:latest-dev ./
docker push slidewiki/activitiesservice:latest-dev
