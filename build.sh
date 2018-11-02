#!/bin/bash
#
# Build script for todo.txt-adon for Thunderbird email application
# Output: todotxt_$version$.xpi
# Copyright (C) 2018 Roy Kokkelkoren
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.

function show_help {
  echo "usage: build.sh [-d | -h]"
  echo "Options and arguments"
  echo "-d    : Enabling debugging, will show debug messages in Thunderbird [NOT FOR PRODUCTION]"
  echo "-h    : Show this help"
}

while getopts "dh" opt; do
  case $opt in
    d)
      echo "Building add-on with DEBUGGING enabled!"
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

if [ -e install.rdf ]; then
  VERSION=$(sed -n 's/.*<em:version>\(.*\)<\/em:version>/\1/p' install.rdf)
  FILE="todotxt_${VERSION}.xpi"
else
  echo '[ERROR] build.sh not executed from add-on directory, exiting!'
  exit 1
fi

echo "Building version [$VERSION]"

PREV_BUILDS="$(ls todotxt_* 2>/dev/null)"
if [ -n "$PREV_BUILDS" ]; then
  echo "Removing old builds [$PREV_BUILDS]"
  rm $PREV_BUILDS
fi

# Ensure that debugMode is set to false
if [ ! $DEV ]; then
  sed -i 's/ mDebugMode = true;/ mDebugMode = false;/g' modules/logger.jsm
fi

zip -qr $FILE chrome* install.rdf components defaults icon.png modules
sed -i 's/ mDebugMode = false;/ mDebugMode = true;/g' modules/logger.jsm

echo "Finished build [$FILE]"
