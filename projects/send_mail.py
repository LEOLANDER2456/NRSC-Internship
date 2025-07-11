import smtplib
import sys
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

def send_email(to_address, subject, body, latitude, longitude):
    from_address = 'sender email' # specific for every user
    password = 'passkey'  # Use an app-specific password if 2FA is enabled

    # Create the MIME message
    msg = MIMEMultipart('alternative')
    msg['From'] = from_address
    msg['To'] = to_address
    msg['Subject'] = subject

    # Attach the HTML body to the email
    html_part = MIMEText(body, 'html')
    msg.attach(html_part)

    # Send the email
    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
        server.login(from_address, password)
        server.sendmail(from_address, to_address, msg.as_string())

if __name__ == "__main__":
    to_address = sys.argv[1]
    subject = sys.argv[2]
    body = sys.argv[3]
    latitude = sys.argv[4]
    longitude = sys.argv[5]

    coordinates_link = f'https://www.google.com/maps/search/?api=1&query={latitude},{longitude}'
    body += f'<br><br>Coordinates Link: <a href="{coordinates_link}">{coordinates_link}</a>'

    send_email(to_address, subject, body, latitude, longitude)
