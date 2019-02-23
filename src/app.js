import gql from 'graphql-tag';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';
import aws_config from './aws-exports';
import {listParks, getNearby, getWithinBoundingBox} from './graphql/queries'
import { GoogleOAuth } from '@aws-amplify/core';
import { PassThrough } from 'stream';

console.log("App started.");
var map;
var markers = [];
initMap(); 
google.maps.event.addListener(map, 'bounds_changed', getWithinMap);


const client = new AWSAppSyncClient({
  url: aws_config.aws_appsync_graphqlEndpoint,
  region: aws_config.aws_appsync_region,
  auth: {
    type: AUTH_TYPE.API_KEY,
    apiKey: aws_config.aws_appsync_apiKey,
  }
});

function initMap() {
  console.log("Calling initMap")
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: -34.397, lng: 150.644},
    zoom: 15
  });


  // Try HTML5 geolocation
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      var pos = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
      console.log("pos:", pos.toString());
      map.setCenter(pos);
    }, function() {
      handleLocationError(true, infoWindow, map.getCenter());
    });
  } else {
    // Browser does not support geolocation.
    handleLocationError(false, infoWindow, map.getCenter());
  }
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
  infoWindow.setPosition(pos);
  infoWindow.setContent(browserHasGeolocation ?
                        'Error: the geolocation service has failed.' : 
                        'Error: your browser does not support geolocation.');
  infoWindow.open(map);
}

function getWithinMap() {
  var bounds = map.getBounds();
  console.log("Bounds: ", bounds.toString());

  client.query({
    query: gql(getWithinBoundingBox),
    variables: {
      top_right_gps: JSON.stringify({
        lat: bounds.getNorthEast().lat(),
        lon: bounds.getNorthEast().lng()
      }),
      bottom_left_gps: JSON.stringify({
        lat: bounds.getSouthWest().lat(),
        lon: bounds.getSouthWest().lng()
      })
    }
  }).then(({data: { getWithinBoundingBox } }) => {
    deleteMarkers();

    console.log("Listing parks from getWithinBoundingBox: ");
    console.log(getWithinBoundingBox);

    for (var park of getWithinBoundingBox) {
      let location = park.location.replace("\"","").split(",");
      let position = {
        lat: parseFloat(location[0]),
        lng: parseFloat(location[1])
      };

      var marker = new google.maps.Marker({position: position, map: map, title: park.name});
      markers.push(marker);
    }

    showMarkers();
  }).catch(e => {
    console.error(e);
  });
}

function setMapOnAll(map) {
  for (var i = 0; i < markers.length; i++) {
    markers[i].setMap(map);
  }
}

function showMarkers() {
  setMapOnAll(map);
}
function deleteMarkers() {
  setMapOnAll(null);
  markers = [];
}


// TEST OF GET NEARBY
function nearby(location = new google.maps.LatLng(40.722988, -73.841647)) {
  client.query({
    query: gql(getNearby),
    variables: {
      // location: "{\"lat\": \"40.722988\", \"lon\": \"-73.841647\"}"
      location: JSON.stringify({
        lat: location.lat(), 
        lon: location.lng()
      })
    }
  }).then(({data: { getNearby } }) => {

    console.log("Listing parks: ");
    console.log(getNearby);
    for (var park of getNearby)
      console.log(park);
  }).catch(e => {
    console.error(e);
  });
}

// TEST OF LIST PARKS
function testList() {
  client.query({
      query: gql(listParks)
  }).then(({data: { listParks } }) => {

    console.log("Listing parks: ");
    console.log(listParks);
    for (var park of listParks)
      console.log(park.name);
});
}
