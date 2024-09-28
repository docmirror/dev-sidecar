node -v

# npm install -g npm-check-updates

cd ../packages/core
ncu -u

cd ../gui
ncu -u

cd ../mitmproxy
ncu -u
