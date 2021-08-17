import smtplib
import os
from email.message import EmailMessage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from images_to_mesh.app.email.email_config import *


#call this to send a email
def notify_user(id, mailAddr, orderState):
    #am Server als Umgebungsvariable setzen!!!
    '''user = os.environ.get('GMAIL_USER') 
    password = os.environ.get('GMAIL_PASSWORD')'''
    user = USER
    passwd = PASSWORD

    link = URL + id

    mailObj = create_message(link, mailAddr, orderState)
    server = smtplib.SMTP(MAIL_SERVER_ADDR)
    server.starttls()
    
    try:
        server.login(user, passwd)
        result = server.send_message(mailObj)
        server.quit()
        return len(result) == 0
    except:
        return False


def create_message(link, mailAddr, orderState):
    options = { 0 : add_success_text,
                1 : add_fail_text
    }
    message = EmailMessage()
    message['From'] = MAIL_SENDER
    message['To'] = mailAddr
    message['Subject'] = MAIL_SUBJECT
    return options[orderState](message, link)


def add_success_text(message, link):
    message.set_content(MAIL_CONTENT_DEFAULT_SUCCESS % (link))
    with open('images_to_mesh/app/email/html_presets/email_success.html', 'r') as fileObj:
        content=fileObj.read().format(insertlink=link)
        message.add_alternative(content, subtype='html')
    return message

def add_fail_text(message, link):
    message.set_content(MAIL_CONTENT_DEFAULT_FAIL)
    with open('./html_presets/email_fail.html', 'r') as fileObj:
        content=fileObj.read()
        message.add_alternative(content, subtype='html')
    return message


if __name__ == "__main__":
    print(notify_user("https://www.youtube.com/", 'rob.unfried@gmail.com'))