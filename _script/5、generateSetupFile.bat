node -v

cd ../packages/gui

if not exist "dist_electron" mkdir "dist_electron"
start dist_electron

npm run electron:build
