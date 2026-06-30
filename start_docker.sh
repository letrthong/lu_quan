# remove the rest containers if have
docker compose down

# build images
#docker compose build --no-cache
docker compose build --no-cache

# start up containers from all images
docker compose up

#docker compose up -d  ( -d Detached)
