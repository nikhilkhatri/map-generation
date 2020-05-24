// WARNING: There's something borked with negative world coords
global_X = 10000000;
global_Y = 10000000;

// Reducing this will greatly hamper performance
GRID_SIZE = 20;

CELL_WIDTH = 1920;
CELL_HEIGHT = 1080;

GLOBAL_VISITED_ARRAY = []

class Intersection {
	constructor(x, y, i) {
		this.x = x;
		this.y = y;
		this.i = i;
		this.neighbors = [];
	}

	dfs_traverse(this_component_list){
		if (GLOBAL_VISITED_ARRAY[this.i] == 1) {
			return;
		}

		GLOBAL_VISITED_ARRAY[this.i] = 1;
		this_component_list.push(this.i);

		for (var i = 0; i < this.neighbors.length; i++) {
			this_component_list.concat(this.neighbors[i].dfs_traverse(this_component_list));
		}
		return this_component_list;
	}
}

class Neighborhood {
	constructor(indexes, node_list) {

		this.node_list = [];

		let xsum = 0;
		let ysum = 0;

		for (var i = 0; i < indexes.length; i++) {
			xsum += node_list[indexes[i]].x;
			ysum += node_list[indexes[i]].y;
			this.node_list.push(node_list[indexes[i]]);
		}

		// To be renamed with centroid prefix
		this.x = int(xsum / indexes.length);
		this.y = int(ysum / indexes.length);
	}
}

class Cell {
	// This class is the primary rendering unit.
	// All world data will be created in units of cells.
	// This includes:
	//  1. Intersection creation
	//  2. Urban road generation
	//  3. Finding connected components : TODO
	//  4. Border intersection creation : TODO
	//  5. Network creation : TODO
	//  6. 2D world rendering

	constructor(x, y, width, height) {
		// Cells are identified externally
		// Note: x and y are world coordinates, not on-screen

		this.world_x = x;
		this.world_y = y;
		this.width = width;
		this.height = height;

		this.intersections = [];  // Array of [x, y] arrays
		this.grid_roads = [];  // Array of [[x1, y1], [x2, y2]] (start coords, end coords) arrays
	}

	create_intersections() {
		// Populate intersections array with in-cell x y coords
		for (var x = 0; x < this.width; x+=GRID_SIZE) {
			for (var y = 0; y < this.height; y+=GRID_SIZE) {
				let this_x = this.world_x + x;
				let this_y = this.world_y + y;

				if (Cell.is_intersection(this_x, this_y)) {
					this.intersections.push(new Intersection(x, y, this.intersections.length));
				}
			}
		}
	}

	create_neighborhoods() {

		// First create angle array
		let angles = [];  // Raw radians
		let gridded_angles = [];  // grid aligned angles

		for (var i = 0; i < this.intersections.length; i++) {
			let this_x = this.world_x + this.intersections[i].x;
			let this_y = this.world_y + this.intersections[i].y;
			
			angles.push(Cell.generate_radian(this_x, this_y));
		}

		// Now grid-align the angles
		for (var i = 0; i < angles.length; i++) {
			degrees = angles[i] * 360 / TWO_PI;  // Way eaier to do in degrees
			gridded_angles.push(90 * floor(degrees / 90));
		}

		// Now do the actual grid generation
		for (var i = 0; i < this.intersections.length; i++) {
			for (var j = i+1; j < this.intersections.length; j++) {
				let angle_between = 360 * atan(
					(this.intersections[i].y - this.intersections[j].y) / 
					(this.intersections[i].x - this.intersections[j].x)) / 
				TWO_PI;

				let dist_between = dist(this.intersections[i].x, this.intersections[i].y, 
									this.intersections[j].x, this.intersections[j].y);
				// Read this condition as:
					// IF either intersections' grid angle aligns with the angle between the intersections,
					// AND IF the distance between the two is small enough
					// THEN create a grid road
				if ((((angle_between - gridded_angles[i]) % 180  == 0) || 
					((angle_between - gridded_angles[j]) % 180  == 0)) &&
					(dist_between < 5 * GRID_SIZE)) {
					// Yay! Found a grid-road!

					this.grid_roads.push([	[this.intersections[i].x, this.intersections[i].y], 
											[this.intersections[j].x, this.intersections[j].y]]);

					// Add edge to adjacency list
					this.intersections[i].neighbors.push(this.intersections[j]);
					this.intersections[j].neighbors.push(this.intersections[i]);
				}
			}
		}
	}

	plot_grids(){
		strokeWeight(2);
		stroke("#777");

		for (var i = 0; i < this.grid_roads.length; i++) {
			line(this.world_x - global_X + this.grid_roads[i][0][0], 
				 this.world_y - global_Y + this.grid_roads[i][0][1],
				 this.world_x - global_X + this.grid_roads[i][1][0],
				 this.world_y - global_Y + this.grid_roads[i][1][1]);
		}
		noStroke();
		fill("#f55");

		for (var i = 0; i < this.intersections.length; i++) {
			if (this.intersections[i].neighbors.length > 0){
				circle(	this.world_x - global_X + this.intersections[i].x, 
						this.world_y - global_Y + this.intersections[i].y,
						4);
			}
		}
	}

	static generate_onscreen_cells() {
		let cellist = [];
		let initial_vert = -(global_X % CELL_WIDTH);
		let initial_horz = -(global_Y % CELL_HEIGHT);

		for (var i = initial_vert; i < width; i = i + CELL_WIDTH) {
			for (var j = initial_horz; j < height; j = j + CELL_HEIGHT) {
				// There's a cell here!
				cellist.push(new Cell(global_X + i, global_Y + j, CELL_WIDTH, CELL_HEIGHT));
			}
		}

		return cellist;
	}

	static is_intersection(x, y) {
		// These are the result of trial and error
		// TODO: move to global/separate file

		let inv_scale_likelihood = 301;
		let inv_scale_thresh = 3;

		let likelihood = (100 * noise(x/inv_scale_likelihood, y/inv_scale_likelihood));
		let intersection_thresh = (50 * noise(x/inv_scale_thresh, y/inv_scale_thresh));
		
		if (intersection_thresh > likelihood) {
			return true;
		}

		return false;
	}

	static generate_radian(x, y) {
		let inv_scale_angle = 50;
		let theta = TWO_PI * noise(x/inv_scale_angle, y/inv_scale_angle);

		return(theta);
	}

}

function find_connected_components(node_list) {
	let n_nodes = node_list.length;
	GLOBAL_VISITED_ARRAY = new Array(n_nodes).fill(0);
	let connected_component_list = []
	for (var i=0; i<n_nodes; i++) {
		if (GLOBAL_VISITED_ARRAY[i] != 1){

			var this_component_list = this_component_list = node_list[i].dfs_traverse([]);
			if (this_component_list.length > 1){
				connected_component_list.push(this_component_list);
			}
		}
	}
	return connected_component_list;
}

document.onkeypress = function() {
	if (key == 'w') { // W
		global_Y -= 2*GRID_SIZE;
	} else if (key == 'a') { // A
		global_X -= 2*GRID_SIZE;
	} else if (key == 's') { // S
		global_Y += 2*GRID_SIZE;
	} else if (key == 'd') { // D
		global_X += 2*GRID_SIZE;
	} 
	return false;
}


function setup() {
	// P5js init
	var canv = createCanvas(0.9*windowWidth, 0.9*windowHeight);
	canv.parent('put-canvas-here');

	document.getElementById("framerate-display").style.color = "#FFF";
	document.getElementById("framerate-display").style.fontSize = "18pt";
}


function draw() {
	background("#000");
	
	// DEBUG
	// noLoop();
	// cell0 = new Cell(0, 0, CELL_WIDTH, CELL_HEIGHT);
	// cell0.create_intersections();
	// cell0.create_neighborhoods();
	// cell0.plot_grids();

	cells = Cell.generate_onscreen_cells()
	// print(cells.length);
	for (var i = 0; i < cells.length; i++) {
		cells[i].create_intersections();
		cells[i].create_neighborhoods();
		cells[i].plot_grids();
	}
	document.getElementById("framerate-display").textContent = int(frameRate());
}
