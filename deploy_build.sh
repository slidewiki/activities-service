#!/bin/bash

docker build -t slidewiki/activitiesservice ./
docker rmi $(docker images | grep "<none>" | awk "{print \$3}")
docker push slidewiki/activitiesservice
