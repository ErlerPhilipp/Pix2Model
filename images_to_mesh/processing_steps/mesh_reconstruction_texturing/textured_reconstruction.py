from images_to_mesh.processing_steps.erros import ReconstructionError
import subprocess
from pathlib import Path
from typing import List, TextIO

def reconstruct_texturing(file: str) -> str:

    
    print()



def execute_subprocess(command: list[str], logfile: TextIO, error_log: TextIO):
    # Call the COLMAP and OpenMVS command line interface and print all outputs
    try:
        process = subprocess.Popen(command,
                                   stdout=subprocess.PIPE,
                                   stderr=subprocess.PIPE,
                                   universal_newlines=True)
        for stdout_line in iter(process.stdout.readline, ""):
            yield stdout_line
        process.stdout.close()
        (stdout, stderr) = process.communicate()
        if stdout:
            logfile.write(stdout)
        if stderr:
            logfile.write(stderr)
            raise ReconstructionError(stderr.rstrip())
    except ReconstructionError:
        raise
    except OSError as e:
        error_log.write(e.strerror + ': ' + e.filename)
        raise ReconstructionError(e.strerror + ': ' + e.filename)