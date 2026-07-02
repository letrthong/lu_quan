#!/bin/bash

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
        echo "--> Accessing container (telua_python_flask)..."
        docker exec -it telua_python_flask bash
        ;;
    run_unittest)
        echo "--> Running unit tests inside container..."
        docker exec -it telua_python_flask python -m unittest discover -s src
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
