from io import TextIOBase


PROJECT_NAME = 'Images2Mesh'
MAIL_SERVER_ADDR = 'smtp.gmail.com:587'
MAIL_SENDER = 'images2mesh@gmail.com'
MAIL_CONTENT_DEFAULT_SUCCESS = 'Hey,\n\nyour {PROJECT_NAME} order has just finished rendering!\nCheck it out here: %s\n\nYour {PROJECT_NAME}-Team'
MAIL_CONTENT_DEFAULT_FAIL= 'Hey,\n\nthere was an error rendering your {PROJECT_NAME} order.\nPlease try it again\n\nYour {PROJECT_NAME}-Team'
MAIL_SUBJECT = PROJECT_NAME + ' order finished'
USER = MAIL_SENDER
PASSWORD = 'lluezpriceabgwfh'
#has to be changed when deployed
URL='http://localhost:5000/result?id='
class Order_state:
    success, failed = range(2)