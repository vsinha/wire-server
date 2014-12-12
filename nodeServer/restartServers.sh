#!/bin/bash
forever startall

# start the dev server
forever start -l ./prod.log -o ./prod.log -e ./prod.log main.js prod
forever start -l ./dev.log -o ./dev.log -e ./dev.log main.js dev
