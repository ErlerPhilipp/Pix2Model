import os
from typing import List
from pathlib import Path

import images_to_mesh.processing_steps.mesh_reconstruction_texturing.textured_reconstruction as openMVS
from images_to_mesh.processing_steps.erros import ReconstructionError

def process_clouds(file: str) -> str:
    print(f"Got the following result from job 1:\n{file}", flush=True)


    dataset_path: Path = Path(os.path.join(Path(file).parent.parent.parent.parent, 'step2'))
    error_path = str(dataset_path) + '/error.log'
    if not os.path.exists(error_path):
        os.makedirs(dataset_path)
    error_log = open(error_path, "w")

    if not "/usr/src/app/" in file:
        file = "/usr/src/app/" + file

    try:
        dirname = str(os.path.dirname(file))
        if dirname.find("step1") != -1:
            dirname = dirname.replace("step1", "step2")
        else:
            raise ReconstructionError("Invalid input path. Must contain 'step1'.")

        if not os.path.exists(dirname):
            os.makedirs(dirname)

        filename = os.path.basename(file)
        out = "{0}/{1}_{3}{2}".format(dirname, *os.path.splitext(filename) + ("out",))
        openMVS.reconstruct_texturing(file, out)
    except Exception as e:
        error_log.write(e.msg)
        raise

    return out
