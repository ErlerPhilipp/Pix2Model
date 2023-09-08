from cgitb import text
import os
import subprocess
import asyncio
import time
import traceback
import shutil

from typing import List, TextIO
from pathlib import Path, PureWindowsPath
from images_to_mesh.processing_steps.erros import ReconstructionError

def execute_subprocess(command: list[str], logfile: TextIO, error_log: TextIO):
    try:
        process = subprocess.Popen(command,
                                   stdout=subprocess.PIPE,
                                   stderr=subprocess.PIPE,
                                   universal_newlines=True)
        for stdout_line in iter(process.stdout.readline, ""):
            yield stdout_line
        (stdout, stderr) = process.communicate()
        process.stdout.close()
        if stdout:
            logfile.write(stdout)
            logfile.flush()
        if stderr:
            logfile.write(stderr)
            logfile.flush()
            raise ReconstructionError("Texturing error: " + str(stderr.rstrip()))
    except ReconstructionError:
        raise
    except Exception as e:
        raise ReconstructionError("Error occured during texturing: \n" + str(e)) from e

# ############# Folder structure ##################
#
# 4e7c0e6a-c333-4e75-9e67-c7afeed48c53/         datasetPath
# ├── input
# ├── step1
# │   ├── v000
# │   │   ├── openMVS
# │   │   ├── dense                             input_path 
# │   │   │   ├── images
# │   │   │   ├── sparse                        images.txt (camera poses)
# │   │   │   └── stereo
# │   │   │       ├── consistency_graphs
# │   │   │       ├── depth_maps
# │   │   │       └── normal_maps
# │   │   ├── output
# │   │   └── sparse
# │   │       └── 0
# │   ├── v001
# │   │   └── output
# │   ├── v002
# │   │   └── output
# │   └── v003
# │       └── output                            file = 4e7c0e6a.../step1/v00X/output/points.ply
# └── step2
#     ├── v000
#     │   └── output
#     ├── v001
#     │   └── output
#     ├── v002
#     │   └── output
#     └── v003
#         └── output                            out = 4e7c0e6a.../step1/v00X/output/points_out.ply
# 



def reconstruct_texturing(file: str, out:str):
    interface_exe = Path("/", "root", "openMVS_build", "bin", "InterfaceCOLMAP")
    reconstruct_exe = Path("/", "root", "openMVS_build", "bin", "ReconstructMesh")
    refine_exe = Path("/", "root", "openMVS_build", "bin", "RefineMesh")
    texture_exe = Path("/", "root", "openMVS_build", "bin", "TextureMesh")
    version = Path(file).parent.parent.name # v00X
    datasetPath = Path(file).parent.parent.parent.parent # 4e7c0e6a-c333-4e75-9e67-c7afeed48c53/
    openMVS_path = Path(datasetPath, "step1", "v000", "openMVS")
    input_path = Path(datasetPath, "step1", "v000", "dense")
    final_output_path = Path(datasetPath, "step2", version, "output")

    # create log and error files
    log_path = str(Path(datasetPath, "log.txt"))
    logfile = open(log_path, "w")
    error_path = str(Path(datasetPath, "error.txt"))
    errorfile = open(error_path, "w")

    # stop time
    start_time = time.time()
    logfile.write("--- start timer ---\n")
    logfile.flush()

    # create openMVS output folder if not exist
    if not os.path.exists(openMVS_path):
        os.makedirs(openMVS_path)


    ######################### Copy pointcloud ########################
    ##################################################################
    logfile.write("\n")
    logfile.write("Copy pointcloud data to working folder ...\n")
    logfile.flush()
    print("Copy pointcloud data to working folder ...\n", flush=True)
    try:
        # Copy pointcloud from versioning folder to working folder
        source_ply = Path(file)
        destination_ply = Path(input_path, "fused.ply")
        logfile.write(f"Copy file \n'{str(Path(file))}' \nto destination \n'{str(destination_ply)}'\n")
        print(f"Copy file \n'{str(Path(file))}' \nto destination \n'{str(destination_ply)}'\n", flush=True)
        shutil.copy(source_ply, destination_ply)

        # Copy visibility information from versioning to working folder
        source_vis = Path(Path(file).parent, "points.ply.vis")
        destination_vis = Path(input_path, "fused.ply.vis")
        logfile.write(f"Copy file \n'{str(source_vis)}' \nto destination \n'{str(destination_vis)}'\n")
        print(f"Copy file \n'{str(source_vis)}' \nto destination \n'{str(destination_vis)}'\n", flush=True)
        shutil.copy(source_vis, destination_vis)

        # Copy camera positions from versioning to working folder (colmap stores camera poses in images.txt)
        source_images = Path(Path(file).parent, "images.txt")
        destination_images = Path(input_path, "sparse", "images.txt")
        logfile.write(f"Copy file \n'{str(source_images)}' \nto destination \n'{str(destination_images)}'\n")
        print(f"Copy file \n'{str(source_images)}' \nto destination \n'{str(destination_images)}'\n")        
        shutil.copy(source_images, destination_images)

    except Exception as e:
        errorfile.write(str(e))
        errorfile.write(traceback.format_exc())
        errorfile.flush()
        raise
    logfile.write("Finished copying pointcloud data to working folder\n")
    print("Finished copying pointcloud data to working folder\n", flush=True)
    logfile.flush()

    ######################### Convert to MVS #########################
    ##################################################################
    convert_command = [
        interface_exe, "-w", input_path, "--input-file", input_path, "--output-file", Path(openMVS_path, "dense.mvs")]

    logfile.write("\n")
    logfile.write("Convert pointcloud to MVS ...\n")
    logfile.flush()
    print("Convert pointcloud to MVS ...\n", flush=True)
    try: 
        for line in execute_subprocess(command=convert_command, logfile=logfile, error_log=errorfile):
            logfile.write(line)
            logfile.flush()
    except ReconstructionError as e:
        errorfile.write(e.msg)
        errorfile.write(traceback.format_exc())
        errorfile.flush()
        raise
    logfile.write("Finished converting pointcloud to MVS\n")
    logfile.flush()
    print("Finished converting pointcloud to MVS\n", flush=True)

    ########################## Reconstruct ###########################
    ##################################################################
    reconstruct_command = [
        reconstruct_exe, "-w", Path(input_path), "--input-file", 
        Path(openMVS_path, "dense.mvs"), "--output-file",
        Path(openMVS_path, "mesh.mvs")]

    logfile.write("\n")
    logfile.write("Reconstruct mesh ...\n")
    logfile.flush()
    print("Reconstruct mesh ...\n", flush=True)
    try: 
        for line in execute_subprocess(command=reconstruct_command, logfile=logfile, error_log=errorfile):
            logfile.write(line)
    except ReconstructionError as e:
        errorfile.write(e.msg)
        errorfile.write(traceback.format_exc())
        errorfile.flush()
        raise
    logfile.write("Finished reconstructing mesh\n")
    logfile.flush()
    print("Finished reconstructing mesh\n", flush=True)

    ########################### Refine ###############################
    ##################################################################
    refine_command = [
        refine_exe, "-w", Path(input_path), "--resolution-level", "1", "--input-file", 
        Path(openMVS_path, "mesh.mvs"), "--output-file", Path(openMVS_path, "mesh_refine.mvs"), 
        "--close-holes", "120", "--cuda-device", "-1"]

    logfile.write("\n")
    logfile.write("Refine mesh ...\n")
    logfile.flush()
    print("Refine mesh ...\n", flush=True)
    try: 
        for line in execute_subprocess(command=refine_command, logfile=logfile, error_log=errorfile):
            logfile.write(line)
    except ReconstructionError as e:
        errorfile.write(e.msg)
        errorfile.write(traceback.format_exc())
        errorfile.flush()
        raise
    logfile.write("Finished refining mesh\n")
    logfile.flush()
    print("Finished refining mesh\n", flush=True)

    ############################ Texture #############################
    ##################################################################
    texture_command = [
        texture_exe, "-w", Path(input_path), "--export-type", "obj", "--output-file", 
        Path(final_output_path, "mesh_textured.obj"), "--input-file", Path(openMVS_path, "mesh_refine.mvs")]

    logfile.write("\n")
    logfile.write("Texture mesh ...\n")
    logfile.flush()
    print("Texture mesh ...\n", flush=True)
    try: 
        for line in execute_subprocess(command=texture_command, logfile=logfile, error_log=errorfile):
            logfile.write(line)
    except ReconstructionError as e:
        errorfile.write(e.msg)
        errorfile.write(traceback.format_exc())
        errorfile.flush()
        raise
    logfile.write("Finished texturing mesh\n")
    logfile.flush()
    print("Finished texturing mesh\n", flush=True)

    ############################# End ################################
    ##################################################################
    logfile.write("\n")
    logfile.write("--- %(minutes)d minutes and %(seconds)d seconds ---\n" %  {"minutes":(time.time() - start_time)/60, "seconds":(time.time() - start_time)%60})
    logfile.flush()
    print("\n--- %(minutes)d minutes and %(seconds)d seconds ---\n" %  {"minutes":(time.time() - start_time)/60, "seconds":(time.time() - start_time)%60}, flush=True)
