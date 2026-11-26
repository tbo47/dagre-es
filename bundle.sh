rm -rf dist
OUTFILE=dist/dagre-d3.7.0.14.js
npx esbuild src/index.js --bundle --platform=neutral --packages=external --outfile=$OUTFILE
sed -i '' 's|from "d3";|from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";|' $OUTFILE
sed -i '' 's|from "es-toolkit/compat"|from "https://cdn.jsdelivr.net/npm/es-toolkit@1.53.2/compat/+esm"|' $OUTFILE