#!/bin/bash
PWD_DIR=$(pwd)

# Start a new tmux session named 'dev'
tmux new-session -d -s dev_session

# Pane 1: PostgreSQL
tmux send-keys -t dev_session "cd $PWD_DIR && sudo service postgresql start" C-m

# Split horizontally for npm
tmux split-window -h -t dev_session
tmux send-keys -t dev_session "cd $PWD_DIR && npm run dev" C-m

# Split vertically for docker
tmux split-window -v -t dev_session
tmux send-keys -t dev_session "cd $PWD_DIR && docker compose up" C-m

# Select the first pane
tmux select-pane -t 0

# Attach session
tmux attach -t dev_session

