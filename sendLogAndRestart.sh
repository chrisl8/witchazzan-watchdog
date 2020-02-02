#!/usr/bin/env bash
# This one script will start up the entire robot with web interface!
export NVM_DIR="${HOME}/.nvm"
# shellcheck source=/home/chrisl8/.nvm/nvm.sh
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" # This loads nvm

# Grab and save the path to this script
# http://stackoverflow.com/a/246128
SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do # resolve $SOURCE until the file is no longer a symlink
  DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE" # if $SOURCE was a relative symlink, we
need to resolve it relative to the path where the symlink file was located
done
SCRIPTDIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
# echo "${SCRIPTDIR}" # For debugging

cd "${SCRIPTDIR}" || exit
sudo systemctl stop witchazzan-server
echo "Witchazzan Server restarted. Log file attached">/tmp/emailMessageWatchdog.txt
#mutt -a "${SCRIPTDIR}/../witchazzan-server/config/log" -s "Witchazzan Server has Restarted" -- christenlofland@gmail.com doby162@gmail.com < /tmp/emailMessageWatchdog.txt
mutt -a "${SCRIPTDIR}/../witchazzan-server/config/log" -s "Witchazzan Server has Restarted" -- christenlofland@gmail.com < /tmp/emailMessageWatchdog.txt
rm /tmp/emailMessageWatchdog.txt
>"${SCRIPTDIR}/../witchazzan-server/config/log"
sudo systemctl start witchazzan-server
