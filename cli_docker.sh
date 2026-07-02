#!/bin/bash

# Configuration variables
CONTAINER_NAME="telua_python_flask"

# Function to show usage information
show_usage() {
    echo "Usage: $0 [action]"
    echo ""
    echo "Actions:"
    echo "  start         Build images (no-cache) and start containers (default)"
    echo "  restart       Stop and start containers without rebuilding"
    echo "  access        Access the web service container's shell (bash)"
    echo "  run_unittest  Run unit tests inside the container"
    echo "  help          Show this help message"
    echo ""
    echo "If no action is provided, 'start' will be executed."
}

# Function to check if container is running
check_container_running() {
    if [ ! "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
        echo "Error: Container '$CONTAINER_NAME' is not running."
        echo "Please start the containers first using: $0 start"
        exit 1
    fi
}

# Determine the action (default to 'start' if empty)
ACTION=${1:-start}

case "$ACTION" in
    start)
        echo "--> Stopping existing containers..."
        docker compose down
        echo "--> Building images with --no-cache..."
        docker compose build --no-cache
        echo "--> Starting containers..."
        docker compose up
        ;;
    restart)
        echo "--> Stopping existing containers..."
        docker compose down
        echo "--> Starting containers..."
        docker compose up
        ;;
    access)
        check_container_running
        echo "--> Accessing container ($CONTAINER_NAME)..."
        docker exec -it "$CONTAINER_NAME" bash
        ;;
    run_unittest)
        check_container_running
        echo "--> Running unit tests inside container ($CONTAINER_NAME)..."
        docker exec -it "$CONTAINER_NAME" python -m unittest discover -s src
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        echo "Error: Unknown action '$ACTION'"
        show_usage
        exit 1
        ;;
esac
