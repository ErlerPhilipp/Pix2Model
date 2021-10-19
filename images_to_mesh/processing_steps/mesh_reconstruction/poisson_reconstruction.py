import pymeshlab as ml

from images_to_mesh.processing_steps.mesh_reconstruction.mesh_loader import MeshLoader


# Apply SPSR to Mesh specified by mesh_loader and save result to mesh_file_out
def reconstruct(mesh_loader: MeshLoader, mesh_file_out: str):
    ms = ml.MeshSet(verbose=False)
    mesh_loader.load_mesh(ms)
    ms.apply_filter("surface_reconstruction_screened_poisson", preclean=True, depth=12)
    ms.save_current_mesh(mesh_file_out)
