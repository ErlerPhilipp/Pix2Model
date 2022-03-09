import argparse
import os.path
from pathlib import Path
from datetime import timedelta, datetime
from shutil import rmtree
from os import remove

def cleanup(path: Path, keep_span: timedelta, dry_run: bool) -> None:
    keep_date = datetime.now() - keep_span
    print(f"Doing cleanup for folder {str(path.absolute())} for files older than {str(keep_date)}")
    for element in path.glob('*'):
        modification_date = datetime.fromtimestamp(os.path.getmtime(element))
        if modification_date < keep_date:
            if dry_run:
                print(f"[Dry Run] Deleting {element}")
            else:
                print(f"Deleting {element}")
                if element.is_dir():
                    rmtree(element, ignore_errors=True)
                elif element.is_file():
                    remove(element)


if __name__ == '__main__':
    argParser = argparse.ArgumentParser(description="Cleanup files older than given time")
    argParser.add_argument("path", type=Path, help="path to a folder where the cleanup should be done")
    argParser.add_argument("days", type=int, help="how many days old a file can be to be kept")
    argParser.add_argument("-d", action='store_true', help="do a dry run")
    arguments = argParser.parse_args()
    cleanup(arguments.path, timedelta(days=arguments.days), arguments.d)
