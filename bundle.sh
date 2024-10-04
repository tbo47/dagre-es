rm -rf dist
OUTFILE=dist/dagre-d3.7.0.11.js
npx esbuild src/index.js --bundle --platform=neutral --packages=external --outfile=$OUTFILE
sed -i '' 's|from "d3";|from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";|' $OUTFILE
sed -i '' 's|from "lodash-es"|from "https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/lodash.min.js"|' $OUTFILE