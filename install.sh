#!/bin/bash

echo "Installing U-Dash Dashboard"

# Update package lists
sudo apt-get update -y

# Install Python3 and pip if not already installed
if ! command -v python3 &> /dev/null
then
    echo "Python3 could not be found, installing..."
    sudo apt-get install python3 -y
fi

if ! command -v pip3 &> /dev/null
then
    echo "pip3 could not be found, installing..."
    sudo apt-get install python3-pip -y
fi

# Create a virtual environment
python3 -m venv u_dash_env
source u_dash_env/bin/activate

echo "Installing Python dependencies..."
pip3 install -r requirements.txt

echo "U-Dash Dashboard installation complete! Run the dashboard using 'flask run' after activating the virtual environment with 'source u_dash_env/bin/activate'."
