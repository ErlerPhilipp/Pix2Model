

class ReconstructionError(Exception):
    """Basic exception for errors raised by reconstruction"""

    def __init__(self, msg=None):
        if msg is None:
            msg = "ReconstructionError: An error occurred during reconstruction, check log file for details"
        super(ReconstructionError, self).__init__(msg)
        self.msg = 'ReconstructionError: ' + msg
