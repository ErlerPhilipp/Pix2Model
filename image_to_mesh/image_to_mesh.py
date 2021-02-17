import time
from pathlib import Path
from typing import List
from os import remove, rmdir


def process_images(image_list: List[str]) -> str:
    print(f"Starting work with images {str(image_list)}")
    time.sleep(5)

    file: Path
    for file in [Path(file) for file in image_list]:
        if file.exists() and file.is_file():
            remove(file)
        time.sleep(2)

    time.sleep(2)
    folder = Path(image_list[0]).parent
    if folder.exists() and folder.is_dir() and not any(folder.iterdir()):
        rmdir(folder)

    return "Finished processing pipeline"
