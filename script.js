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
    style: 'mapbox://styles/nadineconsunji/cmkyjcxru008t01s7c1xvf9fr',  // ****ADD MAP STYLE HERE *****
    center: [-79.37, 43.715],  // starting point, longitude/latitude
    zoom: 10.3 // starting zoom level
});

/*--------------------------------------------------------------------
Step 2: CREATE GEOJSON VARIABLE FOR POINT DATA ON MAP
--------------------------------------------------------------------*/
// create an empty variable to store the pedestrian and cycling collision data 
let pedcycgeojson;

// fetch collision GeoJSON from URL and store response
fetch('https://raw.githubusercontent.com/nadineconsunji/ggr472-lab4-main/main/data/pedcyc_collision_06-21.geojson')
    .then(response => response.json()) // convert response to JSON format 
    .then(response => {
        console.log(response); // Check response in console
        pedcycgeojson = response; // Store geojson as variable using URL from fetch response
    });

let torontoboundary;
// fetch Toronto boundary shapefile form URL and store response
fetch('https://raw.githubusercontent.com/nadineconsunji/ggr472-lab4-main/refs/heads/main/data/toronto.geojson')
    .then(response => response.json()) // convert response to JSON format 
    .then(response => {
        console.log(response); // Check response in console
        torontoboundary = response; // Store geojson as variable using URL from fetch response
    });

/*--------------------------------------------------------------------
Step 3: CREATE BOUNDING BOX AND HEXGRID + ADD SOURCES/LAYERS TO MAP
--------------------------------------------------------------------*/
map.on('load', () => {
    // BOUNDING BOX 
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

    // create the envelope into a bounding box - array of coordinates (need as array coordinates to create a hexgrid)
    let bbox = turf.bbox(envresultTrans)

    // HEXGRID 
    // create hexgrid 
    var cellSide = 2
    var options = {units: "kilometers"}
    let hexgrid = turf.hexGrid(bbox, cellSide, options)

    // AGGREGATE COLLISION DATA PER HEXAGON IN THE HEXGRID 
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

    // ADDING TO MAP
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
        'ped_cyc_col-pnts', // Ensures points are layered above lines 
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

    // ADDING MAP CONTROLS AND INTERACTIVITY
    // Search control 
    map.addControl(
        new MapboxGeocoder({
            accessToken: mapboxgl.accessToken,
            mapboxgl: mapboxgl,
            countries: "ca" // Limit to Canada only
            })
    );

    // Add zoom and rotation controls to the top left of the map
    map.addControl(new mapboxgl.NavigationControl());

    // Add fullscreen option to the map
    map.addControl(new mapboxgl.FullscreenControl());

   // Original view button
    document.getElementById('returnbutton').addEventListener('click', () => {
        map.flyTo({
            center: [-79.37, 43.715],
            zoom: 10.5,
            essential: true
        });
    });

});


// // 2) Change display of legend based on check box
// const legendcheck = document.getElementById('legendcheck');
// const bikeshareLegend = document.getElementById('bikeshare-legend');
// const routesLegend = document.getElementById('routes-parking-legend');

// bikeshareLegend.style.display = legendcheck.checked ? 'block' : 'none';
// routesLegend.style.display = legendcheck.checked ? 'block' : 'none';

// legendcheck.addEventListener('change', () => {
//     if (legendcheck.checked) {
//         bikeshareLegend.style.display = 'block';
//         routesLegend.style.display = 'block';
//     } else {
//         bikeshareLegend.style.display = 'none';
//         routesLegend.style.display = 'none';
//     }
// });

// // 3) Change display of bike share stations layer based on check box using setLayoutProperty method
// document.getElementById('layercheck').addEventListener('change', (e) => {
//     map.setLayoutProperty(
//         'bikeshare-fill',
//         'visibility',
//         e.target.checked ? 'visible' : 'none'
//     );
// });

// // 4) Filter data layer to show selected neighbourhood near UofT from dropdown selection
// let boundaryvalue;

// document.getElementById("boundaryfieldset").addEventListener('change',(e) => {   
//     boundaryvalue = document.getElementById('boundary').value;

//     if (boundaryvalue == 'All') {
//         map.setFilter(
//             'bikeshare-fill',
//             ['has', 'AREA_NAME'] // Returns all polygons from layer that have a value in AREA_NAME field
//         );
//     } else {
//         map.setFilter(
//             'bikeshare-fill',
//             ['==', ['get', 'AREA_NAME'], boundaryvalue] // returns polygon with AREA_NAME value that matches dropdown selection
//         );
//     }

// });

// /*--------------------------------------------------------------------
// Adding click events (when neighbourhood is clicked, a pop-up will display its name)
// --------------------------------------------------------------------*/
// map.on('load', () => {
//     // Changing mouse to pointer when over bike share layer
//     map.on('mouseenter', 'bikeshare-fill', () => {
//         map.getCanvas().style.cursor = 'pointer';
//     });

//     // Changing mouse to normal cursor when no longer over bike share layer
//     map.on('mouseleave', 'bikeshare-fill', () => {
//         map.getCanvas().style.cursor = '';
//     });

//     // Coding for pop-up when mouse clicks a neighbourhood
//     map.on('click', 'bikeshare-fill', (e) => {
//         new mapboxgl.Popup()
//             .setLngLat(e.lngLat)
//             .setHTML("Neighbourhood: " + e.features[0].properties.AREA_NAME)
//             .addTo(map);
//     });

// });
// // HINT: Think about the display of your data and usability of your web map.
// //      Update the addlayer paint properties for your hexgrid using:
// //        - an expression
// //        - The COUNT attribute
// //        - The maximum number of collisions found in a hexagon
// //      Add a legend and additional functionality including pop-up windows


