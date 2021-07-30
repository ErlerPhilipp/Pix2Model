#Alle Exception Klassen einfuegen bei denen der Job wiederholt werden soll (max. 3 Versuche danach wie in Zeile 2)
#Bei allen anderen Exceptions wird der User benachrichtigt und der Job gelöscht
from os import close


retry_job = [FileNotFoundError, ZeroDivisionError]
log_events = False

def queue_handler(job, exc_type, exc_value, traceback):
    retries = 0
    if 'retry_count' in job.meta:
        retries = job.meta['retry_count']
    if log_events:
        file = open('/usr/src/app/data/logging_test.txt', 'a+')
    if retries >= 3 or not exc_type in retry_job:
        pass
        #notify user here
        if log_events:
            file.write("User notification")
    else:
        job.meta['retry_count'] = retries + 1
        job.requeue()
        job.save_meta()
        if log_events:
            file.write(f"Retry number {retries}")
    if log_events:
        file.close()
    return True