import subprocess
import yaml
import os

# Config file with path to COLMAP installation
config = yaml.safe_load(open("config.yml"))


# Reconstruct using colmap (https://colmap.github.io/)
def reconstruct_with_colmap(dataset_path: str):

    colmap_path = config['COLMAP']['PATH'] + '/colmap'

    # Set up project directory for reconstruction
    database_path = dataset_path + '/database.db'
    image_path = dataset_path + '/images'
    output_path = dataset_path + '/sparse'

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
    execute_subprocess(command=mapping_command, verbose=True)

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


# Test
reconstruct_with_colmap(dataset_path="C:/Users/joey/Desktop/colmap_test")
