from abc import ABC, abstractmethod

import pymeshlab as ml
import numpy as np


# generic loader for meshes stored in different ways
class MeshLoader(ABC):

    @abstractmethod
    def load_mesh(self, ms: ml.MeshSet):
        pass


# mesh loader for all datatypes meshlab supports
class GeneralMeshLoader(MeshLoader):

    def __init__(self,
                 cloud_file_in: str):
        self.cloud_file_in = cloud_file_in

    # @raises PyMeshlabException if unable to load (file not found, file format not supported, ...)
    def load_mesh(self, ms: ml.MeshSet):
        ms.load_new_mesh(self.cloud_file_in)


# mesh loader for meshes split into .npy files (e.g. famous dataset)
# DOES NOT WORK YET
class NPYMeshLoader(MeshLoader):

    def __init__(self,
                 points_path: str,
                 normals_path: str):
        self.points_path = points_path
        self.normals_path = normals_path

    def load_mesh(self, ms: ml.MeshSet):
        vertices = np.load(self.points_path).astype('float32')
        normals = np.load(self.normals_path).astype('float32')

        if vertices.shape[1] != 3:
            print("Error: Invalid points matrix shape!")
            exit()
        if normals.shape[1] != 3:
            print("Error: Invalid normals matrix shape!")
            exit()

        # change depending on actual vertex positions, this is just a test to move inside 0.0-1.0
        for i in range(vertices.shape[0]):
            vertices[i] += np.array([0.5, 0.5, 0.5])

        mesh = ml.Mesh(vertex_matrix=vertices, v_normals_matrix=normals)
        mesh.update_bounding_box()
        ms.add_mesh(mesh=mesh)
