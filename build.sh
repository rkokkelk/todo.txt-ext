#!/bin/bash
#
# Build script for add-on
# resulting in zip formatted file todotxt_$version$.xpi

VERSION=$(sed -n 's/.*<em:version>\(.*\)<\/em:version>/\1/p' install.rdf)
FILE="todotxt_${VERSION}.xpi"

function show_help {
  echo "usage: build.sh [-d | -h]"
  echo "Options and arguments"
  echo "-d    : Enabling debugging, will show debug messages in Thunderbird [NOT FOR PRODUCTION]"
  echo "-h    : Show this help"
}

while getopts "dh" opt; do
  case $opt in
    d)
      DEV=true
      ;;
    h)
      show_help
      exit 0
      ;;
    \?)
      show_help
      exit 1
      ;;
  esac
done

echo "Building version [$VERSION]"

PREV_BUILDS=$(ls todotxt_*)
if [ $? ];
then
  echo "Removing old builds [$PREV_BUILDS]"
  rm todotxt_*.xpi
fi

# Ensure that debugMode is set to false
if [ ! $DEV ]; then
  sed -i 's/ mDebugMode = true;/ mDebugMode = false;/g' modules/logger.jsm
fi

zip -qr $FILE chrome* install.rdf components defaults icon.png modules
sed -i 's/ mDebugMode = false;/ mDebugMode = true;/g' modules/logger.jsm

echo "Finished build [$FILE]"
