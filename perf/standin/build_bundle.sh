#!/bin/bash
# usage: build_bundle.sh <frontend dir> <out dir>
SRC=$1; OUT=$2
ESB=/home/claude/.npm-global/lib/node_modules/tsx/node_modules/esbuild/bin/esbuild
G=/home/claude/.npm-global/lib/node_modules
mkdir -p $OUT
cd $SRC
$ESB src/main.jsx --bundle --minify --outfile=$OUT/bundle.js --loader:.css=empty \
  --alias:react-router-dom=/home/claude/demo-harness/router-shim.jsx --alias:react=$G/react --alias:react-dom=$G/react-dom \
  --define:process.env.NODE_ENV='"production"' --define:import.meta.env.VITE_API_URL='"http://localhost:5000/api"' --jsx=automatic --format=iife --log-level=error
cat src/styles/index.css src/styles/Navbar.css src/styles/Landing.css src/styles/Dashboard.css src/styles/TaskCard.css src/styles/TaskDetail.css src/styles/Auth.css src/styles/Modal.css > $OUT/all.css
printf '<!doctype html><html><head><meta charset="utf-8"><title>TaskFlow</title><link rel="stylesheet" href="all.css"></head><body><div id="root"></div><script src="bundle.js"></script></body></html>' > $OUT/index.html
