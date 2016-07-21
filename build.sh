#!/bin/bash
#
# Build script for add-on
# resulting in zip formatted file todotxt_version.xpi

VERSION=$(sed -n 's/.*<em:version>\(.*\)<\/em:version>/\1/p' install.rdf)
FILE="todotxt_${VERSION}.xpi"

while getopts "d" opt; do
  case $opt in
		d)
			DEV=true
			;;
    \?)
			rm $OUT
			exit 1
      ;;
  esac
done

echo "Build version [$VERSION]"
# Ensure that debugMode is set to false

if [ ! $DEV ]; then
  sed -i 's/ mDebugMode = true;/ mDebugMode = false;/g' modules/logger.jsm
fi

zip -r $FILE chrome* install.rdf components defaults icon.png modules
sed -i 's/ mDebugMode = false;/ mDebugMode = true;/g' modules/logger.jsm

echo "Finished build [$FILE]"
