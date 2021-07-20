import os
from typing import List

import images_to_mesh.processing_steps.mesh_reconstruction.poisson_reconstruction as spsr
from images_to_mesh.processing_steps.mesh_reconstruction.mesh_loader import GeneralMeshLoader


def process_clouds(files: List[str]) -> bool:
    print(f"Got the following result from job 1:\n{str(files)}")

    dirname = os.path.dirname(files [0])
    parts = dirname.split("/")
    for i, part in enumerate(parts):
        if part == "step1":
            parts[i] = "step2"
            dirname = "/".join(parts)
    os.makedirs(dirname)

    files = ["/test_data/points_dense.ply"]

    for file in files:
        filename = os.path.basename(file)
        out = "{0}/{1}_{3}{2}".format(dirname, *os.path.splitext(filename) + ("out",))
        spsr.reconstruct(GeneralMeshLoader(file), out)

    return True
