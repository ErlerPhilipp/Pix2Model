# Setup

This guide is meant for people who want to set up and run their own Pix2Model server.


## Hardware

To finish in a reasonable time, you should have a somewhat modern hardware with a recent NVIDIA GPU.
Our system currently runs on:
- CPU: AMD Ryzen 7 5800x
- GPU: NVIDIA GeForce RTX 3090
- RAM: DDR4 64 GB, 3600MHz


## Operating System

The server should run on a Linux/Unix. We recommend the current [Ubuntu LTS](https://ubuntu.com/).
We tested this setup on Ubuntu 20/22 LTS and Windows 10/11.
If your installation is fresh, you may need to install some basic packages like git:
```bash
sudo apt-get update
sudo apt-get install git
```

Your current user must have sudo rights.


## CUDA and GPU Driver

Since CUDA is the de-facto standard in GPU computing, the used software requires an NVIDIA GPU.
We recommend CUDA >=11.4, which corresponds to driver version >=450. 
COLMAP requires the CUDA toolkit, which comes with the driver. 
Do not install the driver manually to reduce the risk of ambiguities.

Follow the instructions of the [NVIDIA CUDA toolkit](https://developer.nvidia.com/cuda-downloads).
For the recommended setup, you can use the following commands:
```bash
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-ubuntu2204.pin
sudo mv cuda-ubuntu2204.pin /etc/apt/preferences.d/cuda-repository-pin-600
wget https://developer.download.nvidia.com/compute/cuda/12.2.1/local_installers/cuda-repo-ubuntu2204-12-2-local_12.2.1-535.86.10-1_amd64.deb
sudo dpkg -i cuda-repo-ubuntu2204-12-2-local_12.2.1-535.86.10-1_amd64.deb
sudo cp /var/cuda-repo-ubuntu2204-12-2-local/cuda-*-keyring.gpg /usr/share/keyrings/
sudo apt-get update
sudo apt-get -y install cuda
```

Check your CUDA installation with:
```bash
nvidia-smi
```
You should see your GPU and the recommended driver and CUDA versions.


## Docker and NVIDIA Container Toolkit

Our software runs in Docker containers with GPU support. 
Therefore, we need to install first Docker and then the NVIDIA Container Toolkit.

NVIDIA Container Toolkit requires [Docker](https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository) 
version >=20.10.XX, which you can install with:
```bash
sudo apt-get update
sudo apt-get install docker-ce=5:20.10.13~3-0~ubuntu-jammy docker-ce-cli=5:20.10.13~3-0~ubuntu-jammy containerd.io docker-buildx-plugin docker-compose-plugin
```

Test Docker with:
```bash
sudo service docker start
sudo docker run hello-world
sudo service docker stop  # stop again or container toolkit installation will fail
```

Now that Docker is installed, we can add GPU support by installing the NVIDIA Container Toolkit. 
In our last attempt, the 
[official guide](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html) did not work. 
We used the following commands instead, which point to the experimental instead of the stable version:
```bash
distribution=$(. /etc/os-release;echo $ID$VERSION_ID) \
      && curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg \
      && curl -s -L https://nvidia.github.io/libnvidia-container/experimental/$distribution/libnvidia-container.list | \
         sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
         sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit-base

# Configure CTK for Docker
sudo mkdir /etc/docker/
sudo nvidia-ctk runtime configure --runtime=docker
```

Test GPU support in Docker:
```bash
sudo systemctl restart docker
sudo docker run --rm --runtime=nvidia --gpus all nvidia/cuda:11.6.2-base-ubuntu20.04 nvidia-smi
```
You see the same nvidia-smi output as before, but now from inside the container.


## Server User

While it's possible to run our system with your personal user, we recommend to create a new user for the server:
```bash
sudo adduser netidee-server
```

Run the following commands while impersonating the new user with sudo capabilities:
```bash 
sudo su -- netidee-server
cd ~
```


## Pix2Model

If you just want to run our system, make an empty folder for our project and clone the repository:
```bash
mkdir repos
cd repos
git clone https://github.com/ErlerPhilipp/Pix2Model.git
cd Pix2Model
```
If you plan to modify it, please fork our repository first and clone your fork instead.

Create a `.env` file with the following content with a username and password of your choice:
```bash
UPLOAD_FOLDER=upload
RQ_DASHBOARD_USERNAME=[rq_user]
RQ_DASHBOARD_PASSWORD=[rq_pw]
SSL_CERT_FOLDER=cert
BACKEND_LOG=backend_log
```


### SSL

You can skip these steps but browsers will warn about unsecure connection, or even block it.
NGINX won't start if the certificate is missing or invalid. In order to start in HTTP mode, 
you need open `web/nginx.conf`, replace the HTTP locations with the SSL locations and comment out the whole SSL block.
Now, you should be able to connect to the server via HTTP (port 8082), at least with Google Chrome (in incognito mode). 

You can manually create a certificate by following the instructions on https://www.sslforfree.com/. 
Or you can automate it with Certbot (https://certbot.eff.org/). For this, you need to create a Cron job and a script that triggers a docker image. See [SSL Automation](setup_ssl.md) for more information.


### Running the System

Now, you can finally start the server with:
```bash
sudo bash start.sh
```
This will take a while the first time, since it needs to download the Docker images and build the containers.

Once it runs, you can open the frontend at https://localhost/ in your browser.

Images for testing the system can be found at COLMAP: https://colmap.github.io/datasets.html

You can see the running, queued and completed jobs in the dashboard at https://localhost/dashboard/. 
Login with the credentials you set in the `.env` file.

If you run into any issues, please see the [troubleshooting guide](troubleshooting.md).

