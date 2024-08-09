import subprocess
import os
import numpy as np
import shutil

from pathlib import Path
from typing import List, TextIO
from plyfile import PlyData, PlyElement
from images_to_mesh.processing_steps.erros import ReconstructionError
from images_to_mesh.processing_steps.sfm.read_write_model import read_points3D_binary
import re

def reconstruct_with_colmap_sparse(image_list: List[str]) -> List[str]:
    """Generate a !sparse! point cloud from a list of input images and save it as a .ply file

    Uses COLMAP (https://colmap.github.io/) for reconstruction and provides the output point cloud
    as a .ply file with rgb vertex colors.

    :param image_list: List of images for feature extraction
    :return: Path to file with reconstruction results
    """

    dataset_path: Path = Path(os.path.join(Path(image_list[0]).parent.parent, 'step1/v000'))
    os.makedirs(dataset_path)

    print(f"Starting reconstruction with colmap for dataset path: {str(dataset_path)}")

    # Set up project directory for reconstruction
    database_path = str(dataset_path) + '/database.db'
    image_path = str(dataset_path.parent.parent) + '/input'
    sparse_path = str(dataset_path) + '/sparse'
    dense_path = str(dataset_path) + '/dense'
    output_path = str(dataset_path) + '/output'

    # Create log file
    log_path = str(dataset_path) + '/log.txt'
    #logfile = open(log_path, "a")
    #logfile.close()

    # Create error log file
    error_path = str(dataset_path) + '/error.log'
    error_log = open(error_path, "a") # call once to create the file
    error_log.close()

    num_processes = str(os.cpu_count() - 1)

    try:
        make_directory(path=sparse_path, error_path=error_path)        
        make_directory(path=dense_path, error_path=error_path)
        make_directory(path=output_path, error_path=error_path)
    except ReconstructionError as e:
        with open(error_path, "a") as error_log:
            error_log.write("Colmap reconstruction error [Make directories]!\n" + e.msg)
        #raise

    output_file = output_path + '/points.ply'

    # Extract features
    # with open() closes file automatically
    with open(log_path, "a") as logfile:
        logfile.write(f"Extracting features...\n")
    extract_command = [
        'colmap', 'feature_extractor',
        '--database_path', database_path,
        '--image_path', image_path,
        '--SiftExtraction.num_threads', num_processes
    ]
    try:
        for line in execute_subprocess(command=extract_command, log_path=log_path, error_path=error_path):
            parse_text_output(line, log_path, error_path)
    except ReconstructionError as e:
        with open(error_path, "a") as error_log:
            error_log.write("Colmap reconstruction error [Extracting features]!\n" + e.msg)
        #error_log.write(e.msg)
        #raise

    # Matching
    with open(log_path, "a") as logfile:
        logfile.write(f"Performing matching...\n")
    matching_command = [
        'colmap', 'exhaustive_matcher',
        '--database_path', database_path,
        '--SiftMatching.num_threads', num_processes
    ]
    try:
        for line in execute_subprocess(command=matching_command, log_path=log_path, error_path=error_path):
            parse_text_output(line, log_path, error_path)
    except ReconstructionError as e:
        with open(error_path, "a") as error_log:
            error_log.write("Colmap reconstruction error [Matching]!\n" + e.msg)
        #error_log.write(e.msg)
        #raise

    # Mapping
    with open(log_path, "a") as logfile:
        logfile.write(f"Performing mapping...\n")
    mapping_command = [
        'colmap', 'mapper',
        '--database_path', database_path,
        '--image_path', image_path,
        '--output_path', sparse_path,
        '--Mapper.num_threads', num_processes
    ]
    try:
        for line in execute_subprocess(command=mapping_command, log_path=log_path, error_path=error_path):
            parse_text_output(line, log_path, error_path)
    except ReconstructionError as e:
        with open(error_path, "a") as error_log:
            error_log.write("Colmap reconstruction error [Mapping]!\n" + e.msg) 
        #error_log.write(e.msg)
        #raise

    # Undistort
    with open(log_path, "a") as logfile:
        logfile.write(f"Performing undistorting...\n")
    undistort_command = [
        'colmap', 'image_undistorter',
        '--image_path', image_path,
        '--input_path', sparse_path + '/0',
        '--output_path', dense_path,
        '--output_type', 'COLMAP',
        '--max_image_size', '2000'
    ]
    try:
        for line in execute_subprocess(command=undistort_command, log_path=log_path, error_path=error_path):
            parse_text_output(line, log_path, error_path)
    except ReconstructionError as e:
        with open(error_path, "a") as error_log:
            error_log.write("Colmap reconstruction error [Undistortion]!\n" + e.msg)
        #error_log.write(e.msg)
        #raise

    # Model Converter
    # TODO: Skip txt conversion for better perforamnce
    # Reconstructoin quality decreases immensely after converting to txt
    with open(log_path, "a") as logfile:
        logfile.write(f"Performing model conversion to txt format...\n")
    model_converter_command = [
        'colmap', 'model_converter',
        '--output_type', 'TXT',
        '--input_path', dense_path + '/sparse',
        '--output_path', dense_path + '/sparse'
    ]
    try:
        for line in execute_subprocess(command=model_converter_command, log_path=log_path, error_path=error_path):
            parse_text_output(line, log_path, error_path)
    except ReconstructionError as e:
        with open(error_path, "a") as error_log:
            error_log.write("Colmap reconstruction error [Model conversion TXT]!\n" + e.msg)
        #error_log.write(e.msg)
        #raise
    
    # Convert sfm to ply and save for the editor
    #convert_to_ply(dataset_path, sparse_path, error_log)
    # PLY Converter
    with open(log_path, "a") as logfile:
        logfile.write(f"Performing model conversion to ply format...\n")
    model_converter_command = [
        'colmap', 'model_converter',
        '--output_type', 'PLY',
        '--input_path', dense_path + '/sparse',
        '--output_path', output_file
    ]
    try:
        for line in execute_subprocess(command=model_converter_command, log_path=log_path, error_path=error_path):
            parse_text_output(line, log_path, error_path)
    except ReconstructionError as e:
        with open(error_path, "a") as error_log:
            error_log.write("Colmap reconstruction error [Model conversion PLY]!\n" + e.msg)
        #error_log.write(e.msg)
        #raise

    # copy camera poses to output folder
    source_images = Path(dense_path, "sparse", "images.txt")
    destination_images = Path(output_path, "images.txt")
    shutil.copy(source_images, destination_images)

    # delete binary data 
    #binary_path = Path(dense_path, 'sparse')
    #file_names = ["cameras.bin", "images.bin", "points3D.bin"]
    #for file in file_names:
    #    file_path = Path(binary_path, file)
    #    if os.path.isfile(file_path):
    #        os.remove(file_path)

    with open(log_path, "a") as logfile:
        logfile.write(f"Output written to: {str(output_file)}\n")

    # Remove error file if empty
    if not os.path.getsize(error_path):
        os.remove(error_path)

    print(f"Finished reconstruction. Output written to: {str(output_file)}, log written to log.txt\n")
    return output_file


def convert_to_ply(dataset_path, sparse_path, error_log):
    # Read points and convert to ply format
    points = read_points3D_binary(sparse_path + '/0/points3D.bin')
    vertices = np.array([], dtype=[
        ('x', 'f4'), ('y', 'f4'), ('z', 'f4'),
        ('red', 'u1'), ('green', 'u1'), ('blue', 'u1')
    ])
    for id, point in points.items():
        vertices = np.append(vertices, np.array([(
            point.xyz[0],
            point.xyz[1],
            point.xyz[2],
            point.rgb[0],
            point.rgb[1],
            point.rgb[2])],
            dtype=vertices.dtype))
    output_dir = str(dataset_path) + '/output'
    #make_directory(output_dir, error_log)
    output_path = output_dir + '/points.ply'
    el = PlyElement.describe(vertices, 'vertex')
    PlyData([el]).write(output_path)
    return output_path


#def execute_subprocess(command: list[str], logfile: TextIO, error_log: TextIO):
def execute_subprocess(command: list[str], log_path: str, error_path: str):
    # Call the COLMAP command line interface and print all outputs
    try:
        process = subprocess.Popen(command,
                                   stdout=subprocess.PIPE,
                                   stderr=subprocess.PIPE,
                                   universal_newlines=True)
        #https://blog.dalibo.com/2022/09/12/monitoring-python-subprocesses.html
        # this for loop already consumes the stdout PIPE, such that process.communicate() gives us an empty stdout
        for stderr_line in iter(process.stderr.readline, ""):
            yield stderr_line
        #(stdout, stderr) = process.communicate()
        #process.stdout.close()
        # stdout returns nothing when calling colmap commands
        #if stdout:
        #    with open(log_path, "a") as logfile:
        #        logfile.write(stdout)
        #if stderr:
        #    with open(error_path, "a") as error_log:
        #        error_log.write(stderr)
        #    raise ReconstructionError(stderr.rstrip())
    except ReconstructionError as e:
        raise
    except OSError as e:
        with open(error_path, "a") as error_log:
            error_log.write(e.strerror + ': ' + e.filename)
        raise ReconstructionError(e.strerror + ': ' + e.filename)
    
        
def parse_text_output(line: str, log_path: str, error_path: str):
    word_list = line.split()
    regex = bool(re.match(r"^([IWE]\d{4})", word_list[0]))
    if(regex & word_list[0].startswith("I")): # info
        with open(log_path, "a") as logfile:
            logfile.write(line)
    elif(regex & word_list[0].startswith("W")): # warning, also write into error file
        with open(error_path, "a") as error_log:
            error_log.write(line)
    elif(regex & word_list[0].startswith("E")): # error
        with open(error_path, "a") as error_log:
            error_log.write(line)
    else: # write undefined lines to error log
        with open(error_path, "a") as error_log:
            error_log.write(line) 
        


#def make_directory(path: str, error_log: TextIO):
def make_directory(path: str, error_path: str):
    try:
        os.mkdir(path)
    except OSError:
        with open(error_path, "a") as error_log:
            error_log.write("Creation of directory %s failed \n" % path)
        raise ReconstructionError("Creation of directory %s failed \n" % path)
