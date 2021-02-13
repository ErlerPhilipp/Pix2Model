import cv2


# Check the installed OpenCV version to see if cv2 is working
def test_ocv():
    print(cv2.__version__)


if __name__ == '__main__':
    test_ocv()

