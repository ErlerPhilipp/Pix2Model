import time
from pathlib import Path
from shutil import copyfile
from typing import List


def process_images(image_list: List[str]) -> List[str]:
    print(f"Starting work with images {str(image_list)}")
    time.sleep(5)

    result_folder: Path = Path(image_list[0]).parent.parent / "step1/"
    print(str(result_folder))
    result_files: List[str] = []
    if not result_folder.exists():
        result_folder.mkdir(parents=True)

    file: Path
    for file in [Path(file) for file in image_list]:
        if file.exists() and file.is_file():
            new_file = result_folder / file.name
            copyfile(file, new_file)
            result_files.append(str(new_file))
        time.sleep(2)

    time.sleep(2)
    return result_files
