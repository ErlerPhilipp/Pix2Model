import subprocess
import os
from pathlib import Path
from typing import List


# Reconstruct using colmap (https://colmap.github.io/)
def reconstruct_with_colmap(image_list: List[str]) -> List[str]:
    dataset_path: Path = Path(image_list[0]).parent.parent

    print(f"Here be the SFM {str(dataset_path)}")

    # TODO: Add colmap to project via Docker
    colmap_path = '/colmap'

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
    extract_command = [colmap_path,
                       'feature_extractor',
                       '--database_path',
                       database_path,
                       '--image_path',
                       image_path]
    # execute_subprocess(command=extract_command, verbose=True)

    # Exhaustive matching
    matching_command = [colmap_path,
                        'exhaustive_matcher',
                        '--database_path',
                        database_path]
    # execute_subprocess(command=matching_command, verbose=True)

    # Mapping
    mapping_command = [colmap_path,
                       'mapper',
                       '--database_path',
                       database_path,
                       '--image_path',
                       image_path,
                       '--output_path',
                       output_path]
    # execute_subprocess(command=mapping_command, verbose=True)

    # Read points
    # TODO

    # Clean up project dir
    # TODO

    # Return points
    # TODO


# Call the colmap command line interface and print all outputs
def execute_subprocess(command: list[str], verbose: bool):
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
