# Map-generation
Algorithms to procedurally generate feasible game maps

## Goal
The goal of this project is to procedurally generate road networks that could be used as the basis for an open-world game.

The road network should have the following loosely defined properties, which I believe will make an interesting, realistic, and feasible map:
1. Fully connected (mostly)
2. Infinite
3. Each subgraph should be generated using only local information
4. Roads in dense regions should be short and grid-aligned
5. Intercity roads should be longer, non-aligned and meandering

## Logic
For simplicity, and to enable property 3, we divide the world into equal sized cells. All roads are formed entirely within a cell. 

The algorithm consists of the following *(very high-level)* steps:
1. Create __intersection__ points using a 2D noise function
2. Connect certain pairs of adjacent intersections using __grid-roads__
3. Treating __intersections__ as nodes, and __grid-roads__ as edges, group each fully connected component of the graph into "neighborhoods"
4. Connect each __neighborhood__ to another __neighborhood__ by adding __long-roads__ in such a manner that the resultant graph is fully connected
5. Create __border-intersections__ that lie on cell borders using a 2D noise function
6. Connect each __border-intersections__ to the nearest __neighborhood__ by adding a __long-road__


## Implementation
The implementation in this repository is an exploratory one, to experiment with algorithms, and is not by itself usable to make a game world. We use [P5.js](https://p5js.org/) for easy visualization in the browser.
The noise currently used for each procedural-generation aspect in the codebase is [Perlin Noise](https://en.wikipedia.org/wiki/Perlin_noise).

## Requirements
P5.js must be installed and available in a `p5/` directory alongside `index.html`.
Get P5.js version 1.0.0 from [here](https://p5js.org/download/).
