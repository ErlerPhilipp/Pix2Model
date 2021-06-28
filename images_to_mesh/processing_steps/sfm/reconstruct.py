import subprocess
import os
from pathlib import Path
from typing import List


# Reconstruct using colmap (https://colmap.github.io/)
def reconstruct_with_colmap(image_list: List[str]) -> List[str]:
    dataset_path: Path = Path(image_list[0]).parent.parent

    print(f"Starting reconstruction with colmap for dataset path: {str(dataset_path)}")

    # Set up project directory for reconstruction
    database_path = str(dataset_path) + '/database.db'
    image_path = str(dataset_path) + '/input'
    output_path = str(dataset_path) + '/sparse'

    try:
        os.mkdir(output_path)
    except OSError:
        print("Creation of the output directory %s failed" % output_path)
        return

    # Extract features
    print(f"Extracting features...")
    extract_command = [
        'colmap', 'feature_extractor',
        '--database_path', database_path,
        '--image_path', image_path,
        '--SiftExtraction.use_gpu', '0'
    ]
    output = (subprocess.check_output(extract_command, universal_newlines=True))
    print(output)

    # Exhaustive matching
    print(f"Performing matching...")
    matching_command = [
        'colmap', 'exhaustive_matcher',
        '--database_path', database_path
    ]
    output = (subprocess.check_output(matching_command, universal_newlines=True))
    print(output)

    # Mapping
    print(f"Performing mapping...")
    mapping_command = [
        'colmap', 'mapper',
        '--database_path', database_path,
        '--image_path', image_path,
        '--output_path', output_path
    ]
    output = (subprocess.check_output(mapping_command, universal_newlines=True))
    print(output)

    # Read points
    # TODO

    # Clean up project dir
    # TODO

    # Return points
    # TODO


# Call the colmap command line interface and print all outputs
def execute_subprocess(command: list[str], verbose: bool):
    print(command)
    process = subprocess.Popen(command,
                               stdout=subprocess.PIPE,
                               universal_newlines=True,
                               shell=True)

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


def run_subprocess(command: list[str]):
    feat_output = (subprocess.check_output(command, universal_newlines=True))
    print(feat_output)
