from typing import List


def some_other_processing(new_files: List[str]) -> bool:
    print(f"Got the following result from job 1:\n{str(new_files)}")
    return True
