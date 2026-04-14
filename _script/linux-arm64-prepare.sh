cd $GITHUB_WORKSPACE/packages/gui
rm vue.config.js
cp linux-arm64.vue.config.js vue.config.js
rm build/mac/1024x1024.png
cd $GITHUB_WORKSPACE