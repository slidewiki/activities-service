#!/bin/bash

docker build -t slidewiki/activityservice ./
docker rmi $(docker images | grep "<none>" | awk "{print \$3}")
docker push slidewiki/activityservice
