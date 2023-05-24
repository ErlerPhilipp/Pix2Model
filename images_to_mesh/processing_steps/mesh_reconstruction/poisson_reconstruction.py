import pymeshlab as ml

from images_to_mesh.processing_steps.mesh_reconstruction.mesh_loader import MeshLoader


# Apply SPSR to Mesh specified by mesh_loader and save result to mesh_file_out
def reconstruct(mesh_loader: MeshLoader, mesh_file_out: str):
    ms = ml.MeshSet(verbose=False)
    mesh_loader.load_mesh(ms)
    print("Starting Screened Poisson Surface Reconstruction ..", flush=True)
    ms.apply_filter("surface_reconstruction_screened_poisson", preclean=True, depth=6)
    print(".. done\nStarting Simplification ..", flush=True)
    # ms.apply_filter("simplification_quadric_edge_collapse_decimation", targetfacenum=1000000)
    print(".. done\n", flush=True)
    ms.save_current_mesh(mesh_file_out)
