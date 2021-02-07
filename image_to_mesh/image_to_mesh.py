import time


def do_work(n: int) -> int:
    print(f"Staring work with {n}")
    time.sleep(10)
    return n + 1
