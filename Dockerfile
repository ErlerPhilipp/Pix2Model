FROM ubuntu:20.04

###########################################################################
# Install python
###########################################################################

RUN apt-get update && apt-get -y install \
    wget \
    software-properties-common \
    libgl1-mesa-glx
RUN add-apt-repository ppa:deadsnakes/ppa
RUN apt-get update && apt-get -y install \
    python3.9 \
    python3-pip
RUN pip install pipenv

###########################################################################
# Install CUDA (sourced from https://gitlab.com/nvidia/container-images/cuda/-/tree/master/dist/11.4.0/ubuntu18.04-x86_64/devel)
###########################################################################

USER root
# base
RUN apt-get update && apt-get install -y --no-install-recommends \
    gnupg2 curl ca-certificates && \
    curl -fsSL https://developer.download.nvidia.com/compute/cuda/repos/ubuntu1804/x86_64/7fa2af80.pub | apt-key add - && \
    echo "deb https://developer.download.nvidia.com/compute/cuda/repos/ubuntu1804/x86_64 /" > /etc/apt/sources.list.d/cuda.list && \
    echo "deb https://developer.download.nvidia.com/compute/machine-learning/repos/ubuntu1804/x86_64 /" > /etc/apt/sources.list.d/nvidia-ml.list && \
    apt-get purge --autoremove -y curl \
    && rm -rf /var/lib/apt/lists/*

ENV CUDA_VERSION 11.4.0

# For libraries in the cuda-compat-* package: https://docs.nvidia.com/cuda/eula/index.html#attachment-a
RUN apt-get update && apt-get install -y --no-install-recommends \
    cuda-cudart-11-4=11.4.43-1 \
    cuda-compat-11-4 \
    && ln -s cuda-11.4 /usr/local/cuda && \
    rm -rf /var/lib/apt/lists/*

# Required for nvidia-docker v1
RUN echo "/usr/local/nvidia/lib" >> /etc/ld.so.conf.d/nvidia.conf \
    && echo "/usr/local/nvidia/lib64" >> /etc/ld.so.conf.d/nvidia.conf

ENV PATH /usr/local/nvidia/bin:/usr/local/cuda/bin:${PATH}
ENV LD_LIBRARY_PATH /usr/local/nvidia/lib:/usr/local/nvidia/lib64

# devel next
ENV NCCL_VERSION 2.10.3

RUN apt-get update && apt-get install -y --no-install-recommends \
    cuda-cudart-dev-11-4=11.4.43-1 \
    cuda-command-line-tools-11-4=11.4.0-1 \
    cuda-minimal-build-11-4=11.4.0-1 \
    cuda-libraries-dev-11-4=11.4.0-1 \
    cuda-nvml-dev-11-4=11.4.43-1 \
    libnpp-dev-11-4=11.4.0.33-1 \
    libnccl-dev=2.10.3-1+cuda11.4 \
    libcublas-dev-11-4=11.5.2.43-1 \
    libcusparse-dev-11-4=11.6.0.43-1 \
    && rm -rf /var/lib/apt/lists/*

# apt from auto upgrading the cublas package. See https://gitlab.com/nvidia/container-images/cuda/-/issues/88
RUN apt-mark hold libcublas-dev-11-4 libnccl-dev

ENV NVIDIA_VISIBLE_DEVICES ${NVIDIA_VISIBLE_DEVICES:-all}
ENV NVIDIA_DRIVER_CAPABILITIES ${NVIDIA_DRIVER_CAPABILITIES:+$NVIDIA_DRIVER_CAPABILITIES,}compute,graphics,utility
ENV NVIDIA_REQUIRE_CUDA "cuda>=11.4 brand=tesla,driver>=418,driver<419 brand=tesla,driver>=440,driver<441 driver>=450"

###########################################################################
# Install COLMAP (see https://colmap.github.io/install.html#linux)
###########################################################################
WORKDIR /root

ENV DEBIAN_FRONTEND non-interactive
ENV DEBCONF_NOWARNINGS yes

# Install depencencies

RUN apt-get update -y -qq \
&&  apt-get install -y -qq --no-install-recommends \
    build-essential \
    ca-certificates \
    cmake \
    git \
    libatlas-base-dev \
    libboost-filesystem-dev \
    libboost-graph-dev \
    libboost-program-options-dev \
    libboost-regex-dev \
    libboost-system-dev \
    libboost-test-dev \
    libcgal-dev \
    libcgal-qt5-dev \
    libeigen3-dev \
    libfreeimage-dev \
    libgflags-dev \
    libglew-dev \
    libgoogle-glog-dev \
    libqt5opengl5-dev \
    libsuitesparse-dev \
    qtbase5-dev \
&&  apt-get autoremove -y -qq \
&&  rm -rf /var/lib/apt/lists/*

ARG SOURCE_DIR=/sources
ARG CERES_SOURCE_DIR=${SOURCE_DIR}/ceres-solver
ARG COLMAP_SOURCE_DIR=${SOURCE_DIR}/colmap
ARG CMAKE_INSTALL_PREFIX=/usr/local

# Get sources

RUN mkdir "${SOURCE_DIR}"

RUN git clone https://ceres-solver.googlesource.com/ceres-solver "${CERES_SOURCE_DIR}" \
&&  git clone https://github.com/colmap/colmap.git "${COLMAP_SOURCE_DIR}"

# Build and install ceres-solver

ARG CERES_SOLVER_COMMIT=facb199f3e

RUN mkdir -p "${CERES_SOURCE_DIR}/build"
WORKDIR ${CERES_SOURCE_DIR}/build

RUN git checkout "${CERES_SOLVER_COMMIT}" \
&&  git rev-parse HEAD > /ceres-solver-version \
&&  cmake .. \
        -DCMAKE_BUILD_TYPE:STRING=Release \
        -DCMAKE_INSTALL_PREFIX:PATH="${CMAKE_INSTALL_PREFIX}" \
        -DBUILD_TESTING:BOOL=OFF \
        -DBUILD_EXAMPLES:BOOL=OFF \
&&  make -j4 \
&&  make install

# Build and install colmap

RUN mkdir -p "${COLMAP_SOURCE_DIR}/build"
WORKDIR ${COLMAP_SOURCE_DIR}/build

RUN cmake .. \
        -DCMAKE_BUILD_TYPE:STRING=Release \
        -DCMAKE_INSTALL_PREFIX:PATH="${CMAKE_INSTALL_PREFIX}" \
        -DBUILD_TESTING:BOOL=OFF \
        -DBUILD_EXAMPLES:BOOL=OFF \
&&  make -j4 \
&&  make install

###########################################################################
# Create final image
###########################################################################

EXPOSE 5000/tcp

WORKDIR /usr/src/app

COPY Pipfile ./
COPY Pipfile.lock ./
COPY test_data /test_data

RUN pipenv install --dev

COPY . .

RUN mkdir data

ENV PYTHONPATH "/usr/src/app"
ENV FLASK_APP "images_to_mesh.app.main"

CMD ["pipenv" ,"run" ,"flask", "run", "--host=0.0.0.0"]
