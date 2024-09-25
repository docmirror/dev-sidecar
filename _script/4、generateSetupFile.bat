cd ../packages/gui

node -v

if not exist "dist_electron" mkdir "dist_electron"
start dist_electron

npm run electron:build
