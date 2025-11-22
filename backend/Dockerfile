FROM python:3.13-slim-bookworm

WORKDIR /app

# 1. Enable non-free repos for Intel Drivers
RUN sed -i 's/Components: main/Components: main contrib non-free non-free-firmware/g' /etc/apt/sources.list.d/debian.sources

# 2. Install System Deps (Drivers, Headers, Utils)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake git wget gpg libpoppler-cpp-dev libglib2.0-0 libre2-dev \
    clinfo opencl-headers ocl-icd-opencl-dev libopenblas-dev && \
    rm -rf /var/lib/apt/lists/*

# 3. ⚡ MANUAL INSTALL: Latest Intel Compute Runtime (N100/Alder Lake)
RUN mkdir -p /tmp/intel-opencl && cd /tmp/intel-opencl && \
    wget https://github.com/intel/compute-runtime/releases/download/24.39.31294.12/libigdgmm12_22.5.2_amd64.deb && \
    wget https://github.com/intel/intel-graphics-compiler/releases/download/igc-1.0.17791.9/intel-igc-core_1.0.17791.9_amd64.deb && \
    wget https://github.com/intel/intel-graphics-compiler/releases/download/igc-1.0.17791.9/intel-igc-opencl_1.0.17791.9_amd64.deb && \
    wget https://github.com/intel/compute-runtime/releases/download/24.39.31294.12/intel-opencl-icd_24.39.31294.12_amd64.deb && \
    dpkg -i *.deb && cd / && rm -rf /tmp/intel-opencl

# 4. Python Requirements
COPY requirements.txt .
RUN pip install --upgrade pip
RUN grep -v "llama-cpp-python" requirements.txt > temp_reqs.txt && \
    pip install --no-cache-dir -r temp_reqs.txt && rm temp_reqs.txt

# 5. COMPILE Engine (GPU enabled, No Adreno)
RUN CMAKE_ARGS="-DGGML_OPENCL=on -DGGML_OPENCL_USE_ADRENO_KERNELS=off" pip install --no-cache-dir --force-reinstall llama-cpp-python>=0.2.77

# 6. Link Libraries
RUN find /usr/local/lib/python3.13 -name "libggml-opencl.so" -exec cp {} /usr/lib/ \; && \
    find /usr/local/lib/python3.13 -name "libllama.so" -exec cp {} /usr/lib/ \; && \
    ldconfig

COPY . .
EXPOSE 30001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "30001"]