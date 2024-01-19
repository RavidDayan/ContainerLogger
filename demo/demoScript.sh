#!/bin/bash

# Build the Docker image
docker build -t countup .

# Run 10 instances of the container
for i in {1..10}
do
  docker run -d --name countup_$i countup
done
