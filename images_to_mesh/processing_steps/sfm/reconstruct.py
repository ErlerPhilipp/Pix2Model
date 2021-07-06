import subprocess
import os
import numpy as np

from pathlib import Path
from typing import List
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

    make_directory(sparse_path)

    # Extract features
    print(f"Extracting features...")
    extract_command = [
        'colmap', 'feature_extractor',
        '--database_path', database_path,
        '--image_path', image_path,
        '--SiftExtraction.use_gpu', '0'
    ]
    execute_subprocess(command=extract_command, verbose=True)

    # Exhaustive matching
    print(f"Performing matching...")
    matching_command = [
        'colmap', 'exhaustive_matcher',
        '--database_path', database_path,
        '--SiftMatching.use_gpu', '0'
    ]
    execute_subprocess(command=matching_command, verbose=True)

    # Mapping
    print(f"Performing mapping...")
    mapping_command = [
        'colmap', 'mapper',
        '--database_path', database_path,
        '--image_path', image_path,
        '--output_path', sparse_path
    ]
    execute_subprocess(command=mapping_command, verbose=True)

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

    print(f"Finished reconstruction. Output written to: {str(output_path)}")
    return output_path


# Call the colmap command line interface and print all outputs
def execute_subprocess(command: list[str], verbose: bool):
    process = subprocess.Popen(command,
                               stdout=subprocess.PIPE,
                               universal_newlines=True)

    # Print console output of command
    if verbose:
        while True:
            output = process.stdout.readline()
            if len(output.strip()) > 0:
                print(output.strip())
            # Do something else
            return_code = process.poll()
            if return_code is not None:
                print('RETURN CODE', return_code)
                # Process has finished, read rest of the output
                for output in process.stdout.readlines():
                    print(output.strip())
                break


def make_directory(path: str):
    try:
        os.mkdir(path)
    except OSError:
        print("Creation of the output directory %s failed" % path)
        return
