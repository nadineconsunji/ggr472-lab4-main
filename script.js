/*--------------------------------------------------------------------
GGR472 LAB 4: Incorporating GIS Analysis into web maps using Turf.js 
--------------------------------------------------------------------*/

/*--------------------------------------------------------------------
Step 1: INITIALIZE MAP
--------------------------------------------------------------------*/
// Define access token
mapboxgl.accessToken = 'pk.eyJ1IjoibmFkaW5lY29uc3VuamkiLCJhIjoiY21rZWU1djI4MDV6NTNkb29meTJzMW81dSJ9.t6RLssyQkfZODRIMy_ToNQ'; 

// Initialize map and edit to your preference
const map = new mapboxgl.Map({
    container: 'map', // container id in HTML
    style: 'mapbox://styles/nadineconsunji/cmkyjcxru008t01s7c1xvf9fr', 
    center: [-79.37, 43.715],  // starting point, longitude/latitude
    zoom: 10.3 // starting zoom level
});

/*--------------------------------------------------------------------
Step 2: CREATE GEOJSON VARIABLE FOR POINT DATA ON MAP
--------------------------------------------------------------------*/
// create an empty variable to store the pedestrian and cycling collision data 
let pedcycgeojson;

// fetch collision GeoJSON from URL and store response
fetch('data/pedcyc_collision_06-21.geojson')
    .then(response => response.json()) // convert response to JSON format 
    .then(response => {
        console.log(response); // Check response in console
        pedcycgeojson = response; // Store geojson as variable using URL from fetch response
    });

let torontoboundary;
// fetch Toronto boundary shapefile form URL and store response
fetch('data/toronto.geojson')
    .then(response => response.json()) // convert response to JSON format 
    .then(response => {
        console.log(response); // Check response in console
        torontoboundary = response; // Store geojson as variable using URL from fetch response
    });

/*--------------------------------------------------------------------
Step 3: CREATE BOUNDING BOX AND HEXGRID + ADD SOURCES/LAYERS TO MAP
--------------------------------------------------------------------*/
map.on('load', () => {
    // ----------------- BOUNDING BOX -----------------
    // create a bounding box around the collision points and store as a variable 
    let envresult = turf.envelope(pedcycgeojson)
    console.log(envresult) // logging envelope result in the console 
    console.log(envresult.bbox) // logging the array property of the envelope in the console
    console.log(envresult.bbox[0]) // logging the first value of the envelope in the console

    // create feature collection holding the envelope features 
    bboxgeojson = {
        "type":"FeatureCollection",
        "features":[envresult]
    }

    // increasing the envelope by 15% to ensure all data points are included later when a hexgrid is made
    let envresultTrans = turf.transformScale (bboxgeojson, 1.15)

    // create the envelope into a bounding box (need as array coordinates to create a hexgrid)
    let bbox = turf.bbox(envresultTrans)

    // ----------------- HEXGRID -----------------
    // create hexgrid 
    var cellSide = 2
    var options = {units: "kilometers"}
    let hexgrid = turf.hexGrid(bbox, cellSide, options)

    // ----------------- AGGREGATE COLLISION DATA PER HEXAGON IN THE HEXGRID -----------------
    // aggregating point data 
    let collishex = turf.collect(hexgrid, pedcycgeojson, '_id', 'values');
    console.log(collishex)

    // using a foreach loop to go through each hexagon to 1. add a point count and 2. identify the maximum number of collisions  
    let maxcollis = 0; // identify baseline number of collisions as 0 
    collishex.features.forEach((feature) => { // go through every hexagon in grid one by one
        feature.properties.COUNT = feature.properties.values.length // create a new property called COUNT 
        if (feature.properties.COUNT > maxcollis) { // if the collision count of the current hexagon is larger than the largest count seen so far/maximum count seen so far (maxcollis), the code will run
            console.log(feature) // log the hexagon with the new maximum to the console
            maxcollis = feature.properties.COUNT // updates the value of maxcollis to the new highest collision count found 
        }
    });

    // ----------------- ADDING TO MAP -----------------
    // add pedestrian and cyclist collision points using GeoJSON variable
    map.addSource('ped_cyc_col', {
        type: 'geojson',
        data: pedcycgeojson
    });

    map.addLayer({
        'id': 'ped_cyc_col-pnts',
        'type': 'circle',
        'source': 'ped_cyc_col',
        'paint': {
            'circle-radius': ['interpolate', // points begin small and get larger as zoom increases
                ['linear'],
                ['zoom'],
                10, 1,
                20, 17],
            'circle-color': 'black'
        }
    });

    // add hexgrid 
    map.addSource('hexgrid_map', {
        type: 'geojson',
        data: hexgrid
    });

    map.addLayer({
        'id': 'hexgrid-lines',
        'type': 'fill',
        'source': 'hexgrid_map',
        'paint': {
            'fill-color': [
                'case',
                ['==',['to-number', ['get', 'COUNT']], 0], 'rgba(0,0,0,0)', // make hexagons with counts of 0 transparent (filter them out)
                ['==',['to-number', ['get', 'COUNT']], maxcollis], '#FF0000', // make hexagon with max. number of collisions red
                [
                    'step', // STEP expression produces stepped results based on value pairs
                    ['to-number', ['get', 'COUNT']], // GET expression retrieves property value from 'bike_share' data field
                    '#fde725', // Colour assigned to any values < first step
                    5, '#a0da39', // Colours assigned to values >= each step
                    10, '#4ac16d',
                    20, '#1fa187',
                    30, '#277f8e',
                    40, '#365c8d', 
                    50, '#46327e', 
                    60, '#440154'
                ],
            ],
            'fill-opacity': 0.4,  
            'fill-outline-color': 'black'
        }
    },
        'ped_cyc_col-pnts', // Ensures points are layered above hexgrid 
    );

    // add Toronto boundary
    map.addSource('toronto', {
        type: 'geojson',
        data: torontoboundary
    });

    map.addLayer({
        'id': 'toronto-line',
        'type': 'line',
        'source': 'toronto',
        'paint': {
            'line-width': 2, 
            'line-color': 'black'
        }
    });

    // ----------------- ADDING INTERACTIVITY (more interactivity below - needed here to use maxcollis) -----------------
    // Filter data layer to show selected hexgrids from drop down selection
    let boundaryvalue;

    document.getElementById("boundaryfieldset").addEventListener('change',(e) => {   
        boundaryvalue = document.getElementById('boundary').value;
        if (boundaryvalue == 'All') {
            map.setFilter('hexgrid-lines', ['has', 'COUNT']); // Returns all hexagons that have a count (all of them)
        } else if (boundaryvalue == '10') {
            map.setFilter('hexgrid-lines', ['>', ['get', 'COUNT'], 10]); // Returns all hexagons with more than 10 collisions 
        } else if (boundaryvalue == '30') {
            map.setFilter('hexgrid-lines', ['>', ['get', 'COUNT'], 30]); // Returns all hexagons with more than 30 collisions 
        } else if (boundaryvalue == '60') {
            map.setFilter('hexgrid-lines', ['>', ['get', 'COUNT'], 60]); // Returns all hexagons with more than 60 collisions
        } else if (boundaryvalue == 'Max') {
            map.setFilter('hexgrid-lines', ['==', ['get', 'COUNT'], maxcollis]); // Returns hexagon with max value of collisions
        } else {
            map.setFilter('hexgrid-lines', ['>', ['get', 'COUNT'], 0]);
        }
    });

    // ----------------- ADDING CLICK EVENTS -----------------
    // When collision is clicked, a pop-up will display the kind of injury at the collision 
    // Changing mouse to pointer when over bike share layer
    map.on('mouseenter', 'ped_cyc_col-pnts', () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    // Changing mouse to normal cursor when no longer over bike share layer
    map.on('mouseleave', 'ped_cyc_col-pnts', () => {
        map.getCanvas().style.cursor = '';
    });

    // Coding for pop-up when mouse clicks a neighbourhood
    map.on('click', 'ped_cyc_col-pnts', (e) => {
        new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML("Injury: " + e.features[0].properties.INJURY)
            .addTo(map);
    });

});

/*--------------------------------------------------------------------
Step 4: ADDING MAP CONTROLS 
--------------------------------------------------------------------*/
// Search control 
map.addControl(
    new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
        countries: "ca", // Limit to Canada only
        bbox: [-79.621974, 43.590289, -79.122974, 43.837935] // Limit to bounding box
        })
);

// Add zoom and rotation controls to the top left of the map
map.addControl(new mapboxgl.NavigationControl());

// Add fullscreen option to the map
map.addControl(new mapboxgl.FullscreenControl());

// Original view button
document.getElementById('returnbutton').addEventListener('click', () => {
    console.log('Button clicked!'); // Check if this log appears when the button is clicked
    map.flyTo({
        center: [-79.37, 43.715],
        zoom: 10.3,
        essential: true
    });
});

/*--------------------------------------------------------------------
Step 5: ADDING MAP INTERACTIVITY
--------------------------------------------------------------------*/

// Change display of legend based on check box
const legendcheck = document.getElementById('legendcheck');
const hexgridLegend = document.getElementById('collisions-legend');
const generalLegend = document.getElementById('general-legend');

hexgridLegend.style.display = legendcheck.checked ? 'block' : 'none';
generalLegend.style.display = legendcheck.checked ? 'block' : 'none';

legendcheck.addEventListener('change', () => {
    if (legendcheck.checked) {
        hexgridLegend.style.display = 'block';
        generalLegend.style.display = 'block';
    } else {
        hexgridLegend.style.display = 'none';
        generalLegend.style.display = 'none';
    }
});

// Change display of hexgrid layer based on check box using setLayoutProperty method
document.getElementById('layercheck').addEventListener('change', (e) => {
    map.setLayoutProperty(
        'hexgrid-lines',
        'visibility',
        e.target.checked ? 'visible' : 'none'
    );
});

// Change display of collisions points layer based on check box 
document.getElementById('layercheck2').addEventListener('change', (e) => {
    map.setLayoutProperty(
        'ped_cyc_col-pnts',
        'visibility',
        e.target.checked ? 'visible' : 'none'
    );
});

