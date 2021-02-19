import pymeshlab as ml

from mesh_loader import MeshLoader, NPYMeshLoader, GeneralMeshLoader


# Apply SPSR to Mesh specified by mesh_loader and safe result to mesh_file_out
def reconstruct_spsr(mesh_loader: MeshLoader, mesh_file_out: str):
    ms = ml.MeshSet()
    mesh_loader.load_mesh(ms)
    ms.set_versbosity(True) # remove for final commit
    ms.apply_filter("surface_reconstruction_screened_poisson", preclean=True) # preclean necessary due to pymeshlab bug until next update
    ms.save_current_mesh(mesh_file_out)

##################################
########### TESTRUNS #############
##################################
meshloader1 = NPYMeshLoader(
    points_path="data/famous_original/04_pts/yoda.xyz.npy",
    normals_path="data/famous_original/06_normals/yoda.xyz.npy"
)
meshloader2 = GeneralMeshLoader(
    cloud_file_in="data/NewModelTest.stl"
)
reconstruct_spsr(mesh_loader=meshloader2,
                 mesh_file_out="out.obj")
