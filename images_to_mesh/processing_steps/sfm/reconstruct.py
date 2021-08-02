import subprocess
import os
import numpy as np

from pathlib import Path
from typing import List, TextIO
from plyfile import PlyData, PlyElement
from images_to_mesh.processing_steps.sfm.read_write_model import read_points3D_binary

def reconstruct_with_colmap(image_list: List[str]) -> List[str]:
    """Generate a point cloud from a list of input images and save it as a .ply file

    Uses COLMAP (https://colmap.github.io/) for reconstruction and provides the output point cloud
    as a .ply file with rgb vertex colors.

    :param image_list: List of images for feature extraction
    :return: Path to file with reconstruction results
    """

    dataset_path: Path = Path(image_list[0]).parent.parent

    print(f"Starting reconstruction with colmap for dataset path: {str(dataset_path)}")

    # Set up project directory for reconstruction
    database_path = str(dataset_path) + '/database.db'
    image_path = str(dataset_path) + '/input'
    sparse_path = str(dataset_path) + '/sparse'
    dense_path = str(dataset_path) + '/dense'
    output_path = str(dataset_path) + '/output'

    make_directory(sparse_path)
    make_directory(dense_path)
    make_directory(output_path)

    output_file = output_path + '/points.ply'

    # Create log file
    log_path = str(dataset_path) + '/log.txt'
    logfile = open(log_path, "w")

    # Extract features
    logfile.write(f"Extracting features...\n")
    extract_command = [
        'colmap', 'feature_extractor',
        '--database_path', database_path,
        '--image_path', image_path
    ]
    for line in execute_subprocess(command=extract_command, logfile=logfile):
        logfile.write(line)

    # Matching
    logfile.write(f"Performing matching...\n")
    matching_command = [
        'colmap', 'exhaustive_matcher',
        '--database_path', database_path
    ]
    for line in execute_subprocess(command=matching_command, logfile=logfile):
        logfile.write(line)

    # Mapping
    logfile.write(f"Performing mapping...\n")
    mapping_command = [
        'colmap', 'mapper',
        '--database_path', database_path,
        '--image_path', image_path,
        '--output_path', sparse_path
    ]
    for line in execute_subprocess(command=mapping_command, logfile=logfile):
        logfile.write(line)

    # Undistort
    logfile.write(f"Performing undistorting...")
    undistort_command = [
        'colmap', 'image_undistorter',
        '--image_path', image_path,
        '--input_path', sparse_path + '/0',
        '--output_path', dense_path,
        '--output_type', 'COLMAP',
        '--max_image_size', '2000'
    ]
    for line in execute_subprocess(command=undistort_command, logfile=logfile):
        logfile.write(line)

    # Patch Match
    logfile.write(f"Performing Patch Match...")
    patch_match_command = [
        'colmap', 'patch_match_stereo',
        '--workspace_path', dense_path,
        '--workspace_format', 'COLMAP',
        '--PatchMatchStereo.geom_consistency', 'true'
    ]
    for line in execute_subprocess(command=patch_match_command, logfile=logfile):
        logfile.write(line)

    # Stereo Fusion
    logfile.write(f"Performing Stereo Fusion...")
    stereo_fusion_command = [
        'colmap', 'stereo_fusion',
        '--workspace_path', dense_path,
        '--workspace_format', 'COLMAP',
        '--input_type', 'geometric',
        '--output_path', output_file
    ]
    for line in execute_subprocess(command=stereo_fusion_command, logfile=logfile):
        logfile.write(line)

    logfile.write(f"Output written to: {str(output_file)}")
    logfile.close()

    print(f"Finished reconstruction. Output written to: {str(output_file)}, log written to log.txt")
    return output_file


def convert_to_ply(dataset_path, sparse_path):
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
    make_directory(output_dir)
    output_path = output_dir + '/points.ply'
    el = PlyElement.describe(vertices, 'vertex')
    PlyData([el]).write(output_path)
    return output_path


# Call the colmap command line interface and print all outputs
def execute_subprocess(command: list[str], logfile: TextIO):
    process = subprocess.Popen(command,
                               stdout=subprocess.PIPE,
                               universal_newlines=True)
    for stdout_line in iter(process.stdout.readline, ""):
        yield stdout_line
    process.stdout.close()
    return_code = process.wait()
    if return_code is not None:
        logfile.write(f"RETURN CODE {str(return_code)}\n")


def make_directory(path: str):
    try:
        os.mkdir(path)
    except OSError:
        print("Creation of directory %s failed" % path)
        return
