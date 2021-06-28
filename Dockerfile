FROM python:3.9

WORKDIR /root

# nvidia-container-runtime
ENV NVIDIA_VISIBLE_DEVICES ${NVIDIA_VISIBLE_DEVICES:-all}
ENV NVIDIA_DRIVER_CAPABILITIES ${NVIDIA_DRIVER_CAPABILITIES:+$NVIDIA_DRIVER_CAPABILITIES,}graphics

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

# Create final image

EXPOSE 5000/tcp

RUN pip install pipenv

WORKDIR /usr/src/app

COPY Pipfile ./
COPY Pipfile.lock ./

RUN pipenv install --dev

COPY . .

RUN mkdir data

ENV PYTHONPATH "/usr/src/app"
ENV FLASK_APP "images_to_mesh.app.main"

CMD ["pipenv" ,"run" ,"flask", "run", "--host=0.0.0.0"]
