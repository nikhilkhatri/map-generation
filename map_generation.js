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
	//  3. Finding connected components
	//  4. Border intersection creation
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

		this.neighborhoods = [];
		this.border_intersections = [];
		this.long_roads = [];
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

		// Grid created.
		// Finding neighbors now

		let neighborhood_list = find_connected_components(this.intersections);

		for (var i = 0; i < neighborhood_list.length; i++) {
			this.neighborhoods.push(new Neighborhood(neighborhood_list[i], this.intersections));
		}
	}

	create_border_intersections(){
		// For each of the 4 borders, calculate how many intersections there should be,
		// and their locations
		// Max 4 intersections per border.

		// For each edge, we use coords of the midpoint, so that adjacent cells' border intersections match up

		let border_scale = 302;

		// TOP
		let num_border_ints = floor(5 * noise((this.world_x + this.width/2)/border_scale, this.world_y/border_scale));
		for (var i = 0; i < num_border_ints; i++) {
			let this_x = floor(this.width * noise((this.world_x + this.width/2)/border_scale, this.world_y/border_scale, i));
			this.border_intersections.push(new Intersection(this_x, 0, this.border_intersections.length));
		}

		// BOTTOM
		num_border_ints = floor(5 * noise((this.world_x + this.width/2)/border_scale, (this.world_y+this.height)/border_scale));
		for (var i = 0; i < num_border_ints; i++) {
			let this_x = floor(this.width * noise((this.world_x+this.width/2)/border_scale, (this.world_y+this.height)/border_scale, i));
			this.border_intersections.push(new Intersection(this_x, this.height, this.border_intersections.length));
		}

		// LEFT
		num_border_ints = floor(5 * noise((this.world_x)/border_scale, (this.world_y+this.height/2)/border_scale));
		for (var i = 0; i < num_border_ints; i++) {
			let this_y = floor(this.height * noise((this.world_x)/border_scale, (this.world_y+this.height/2)/border_scale, i));
			this.border_intersections.push(new Intersection(0, this_y, this.border_intersections.length));
		}

		// RIGHT
		num_border_ints = floor(5 * noise((this.world_x+this.width)/border_scale, (this.world_y+this.height/2)/border_scale));
		for (var i = 0; i < num_border_ints; i++) {
			let this_y = floor(this.height * noise((this.world_x+this.width)/border_scale, (this.world_y+this.height/2)/border_scale, i));
			this.border_intersections.push(new Intersection(this.width, this_y, this.border_intersections.length));
		}
	}

	create_long_roads(){
		// Check 0: Is your new algorithm for this functionality NP Hard/Complete?

		// First sort neighborhoods by centroid X coord
		this.neighborhoods.sort(x_comparator);

		// Connect each neighborhood to the closest unvisited neighborhood to its right

		// TODO: Provide a 2 line proof that this creates a spanning tree
		let visited_array = new Array(this.neighborhoods.length).fill(false);
		for (var i = 0; i < this.neighborhoods.length; i++) {
			let my_j = -1;
			let lowest_dist = Infinity;
			for (var j = i+1; j < this.neighborhoods.length; j++) {
				let this_dist = dist(this.neighborhoods[i].x, this.neighborhoods[i].y, 
									 this.neighborhoods[j].x, this.neighborhoods[j].y)
				
				if ((!visited_array[j]) && (this_dist < lowest_dist)){
					my_j = j;
					lowest_dist = this_dist;
				}
			}
			if (my_j != -1) {
				// Connect the 2 selected neighborhoods through the shortest possible path
				this.long_roads.push(Cell.get_closest_points(this.neighborhoods[i], this.neighborhoods[my_j]));
				visited_array[i] = true;
				visited_array[my_j] = true;
			}
		}
	}

	plot_grids(){
		strokeWeight(2);
		stroke("#777");

		// grid-roads
		for (var i = 0; i < this.grid_roads.length; i++) {
			line(this.world_x - global_X + this.grid_roads[i][0][0], 
				 this.world_y - global_Y + this.grid_roads[i][0][1],
				 this.world_x - global_X + this.grid_roads[i][1][0],
				 this.world_y - global_Y + this.grid_roads[i][1][1]);
		}

		// long-roads
		for (var i = 0; i < this.long_roads.length; i++) {
			line(this.world_x - global_X + this.long_roads[i][0][0], 
				 this.world_y - global_Y + this.long_roads[i][0][1],
				 this.world_x - global_X + this.long_roads[i][1][0],
				 this.world_y - global_Y + this.long_roads[i][1][1]);
		}

		noStroke();
		fill("#f55");

		// intersections
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

	static get_closest_points(na, nb) {
		// na and nb should be Neighborhood objects

		let lowest_dist = Infinity;
		let chosen_a = [];
		let chosen_b = [];

		// BRUTE
		for (var i = 0; i < na.node_list.length; i++) {
			for (var j = 0; j < nb.node_list.length; j++) {
				let this_dist = dist(na.node_list[i].x, na.node_list[i].y,
								 nb.node_list[j].x, nb.node_list[j].y);
				if (this_dist < lowest_dist) {
					lowest_dist = this_dist;
					chosen_a = [na.node_list[i].x, na.node_list[i].y];
					chosen_b = [nb.node_list[j].x, nb.node_list[j].y];
				}
			}
		}
		return [chosen_a, chosen_b];
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

function x_comparator(a, b){
	return a.x - b.x;
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
	// cell0.create_border_intersections();
	// cell0.create_long_roads();
	// cell0.plot_grids();

	cells = Cell.generate_onscreen_cells()
	// print(cells.length);
	for (var i = 0; i < cells.length; i++) {
		cells[i].create_intersections();
		cells[i].create_neighborhoods();
		cells[i].create_border_intersections();
		cells[i].create_long_roads();
		cells[i].plot_grids();
	}
	document.getElementById("framerate-display").textContent = int(frameRate());
}
