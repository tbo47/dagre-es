# dagre-d3-es

The [dagrejs](https://github.com/dagrejs) library exported as [ES](https://262.ecma-international.org/6.0/) modules.

dagre-d3-es versions follow d3 versions. Ex: dagre-d3-es version 5 depends on d3 version 5.


## Install

```
npm install dagre-d3-es --save
```

## Code example

Coming from the legacy `dagre-d3`, the main changes in your code will be:

```
import * as dagreD3 from 'dagre-d3-es';
...
const g = new dagreD3.graphlib.Graph().setGraph({});
...
const zoom = d3.zoom().on('zoom', (zoomEvent) => {
  inner.attr('transform', zoomEvent.transform);
});

```