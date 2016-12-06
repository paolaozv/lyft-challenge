var LyftApi = require('lyft-api');

var defaultClient = LyftApi.ApiClient.default;

var ClientAuthentication = defaultClient.authentications['gAAAAABXvLCVr6uY651QmKu_Pj2_trgqXSPe9AVJ9lldCe3vPjzUDBHXG19FXDZoWZ7_G3U_u01K4fuw3Lj7W6ml30v7jiuH4rlEfaxdqS9UiLhn2eiTkhezLF8Y66I3cpuF4b7UhXlS25Y5xbmPb6Qz5m9dllLJQBH11bxMe4o-Qh5mtAaEUVw='];
ClientAuthentication.accessToken = "04gYKvHBfWi_HS7uuiERZqBiH9V_YWBd";

var api = new LyftApi.PublicApi()

var startLat = latOr; // {Number} Latitude of the starting location

var startLng = longOr; // {Number} Longitude of the starting location

var opts = { 
  'rideType': "rideType_example", // {String} ID of a ride type
  'endLat': latDes, // {Number} Latitude of the ending location
  'endLng': longDes // {Number} Longitude of the ending location
};

var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
};
api.costGet(startLat, startLng, opts, callback);
