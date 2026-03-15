## GGR472 Lab 4

## Repository Contents

This repository contains code for a web map and GeoJSON data layers. 

- `index.html`: HTML file to render the main webpage and map 
- `style.css`: CSS file for positioning the map interface and map elements
- `script.js`: JavaScript file containing code for adding elements to the map

#### Purpose 
More broadly, lab 4 aimed to build off of previous labs' work and develop our knowledge and skills for future application in our group projects. The specific goal was to learn how to perform spatial analysis and visualise outputs using the [Turf.js](https://turfjs.org/) and [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/api/) libraries in the context of pedestrian/cyclist related road collisions in Toronto. 

#### The Map
This project maps the location of pedestrian/cyclist related road collisions in Toronto as well as them number of these collisions aggregated using a hexagonal grid (where the length of the side of each hexagon is 2km). Additionally, when you click on a collision point, it will display what type of injury occurred at that location. Viewers can also use the dropdown menu on the left-hand side to select areas with a particular amount of collisions recorded, including the area where the most amount of collisions were recorded. 

#### Files and Data Sources
Raw GEOJson data files can be found in the "Data" folder. These were sourced from both myself and the City of Toronto's Open Data Portal. 