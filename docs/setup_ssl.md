# SSL Automation

Cron job:
```bash
crontab -l  # check if there is anything already
sudo nano /etc/crontab  # edit
```

Example crontab:
```bash
# Edit this file to introduce tasks to be run by cron.
#
# Each task to run has to be defined through a single line
# indicating with different fields when the task will be run
# and what command to run for the task
#
# To define the time you can provide concrete values for
# minute (m), hour (h), day of month (dom), month (mon),
# and day of week (dow) or use '*' in these fields (for 'any').
#
# Notice that tasks will be started based on the cron's system
# daemon's notion of time and timezones.
#
# Output of the crontab jobs (including errors) is sent through
# email to the user the crontab file belongs to (unless redirected).
#
# For example, you can run a backup of all your user accounts
# at 5 a.m every week with:
# 0 5 * * 1 tar -zcf /var/backups/home.tgz /home/
#
# For more information see the manual pages of crontab(5) and cron(8)
#
# m h  dom mon dow   command
0 0 * * * /home/netidee-server/Server/renew-certs.sh > /dev/null 2>&1
```

renew-cert.sh:
```bash
#!/usr/bin/bash
. /home/netidee-server/Server/vars
cd /home/netidee-server/Server
cd ./$REPO_NAME
docker compose run --rm certbot renew  # run certbot
docker exec repo-client_deployed_dev-1 nginx -s reload  # restart nginx to use new certificate
```

Server/vars:
```bash
REPO_NAME="Repo"
NAME_OF_PUB_BRANCH="main"
USER_ID="github-username"
USER_PW="github-password"
```