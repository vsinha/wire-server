#!/bin/bash
forever stopall

# start the dev server
forever start --minUptime 1000 --spinSleepTime 1000 --append -l ./prod.log -o ./prod.log -e ./prod.log main.js prod
forever start --minUptime 1000 --spinSleepTime 1000 --append -l ./dev.log -o ./dev.log -e ./dev.log main.js dev

forever list
