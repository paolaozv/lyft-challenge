window.addEventListener("load", cargarPagina);

var button = document.getElementById("button-getestimate");
var origin = document.getElementById("origin");
var destination = document.getElementById("destination");
var map = document.getElementById("map");
var directionsRenderer = new google.maps.DirectionsRenderer();
var directionsService = new google.maps.DirectionsService();
var latOr;
var longOr;
var latDes;
var longDes;

function cargarPagina() {

    var myLatlng = new google.maps.LatLng(-12.0552477, -77.0802424);
    var myOptions = {
        zoom: 13,
        center: myLatlng,
        mapTypeControl: false,
        streetViewControl: false,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(map, myOptions);
    button.addEventListener("click", travelToAddress);
}

function travelToAddress(e) {
    e.preventDefault();
    /*var desLatlon;
    var origLatlon;*/
    var request = {
        origin: origin.value,
        destination: destination.value,
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true
    };
    /*directionsRenderer.setMap(null);
    directionsRenderer.setPanel(null);*/
    var geocoder = new google.maps.Geocoder();
    geocoder.geocode({"address": origin.value}, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
            latOr = results[0].geometry.location.lat();
            longOr = results[0].geometry.location.lng();
            desLatlon = new google.maps.LatLng(latOr, longOr);
            console.log(latOr, longOr);
        }
    });

   /* var iconOrigin = "../img/";
    var markerOr = new google.maps.Marker({
        position: origLatlon,
        map: map,
        icon: iconOrigin + "origin.png"
    });*/

    var geocoderDes = new google.maps.Geocoder();
    geocoderDes.geocode({"address": destination.value}, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
            var latDes = results[0].geometry.location.lat();
            var longDes = results[0].geometry.location.lng();
            origLatlon = new google.maps.LatLng(latDes, longDes);
            console.log(latDes, longDes);
            console.log(origLatlon);
        }
    });

    /*var iconDestination = "../img/";
    var markerDes = new google.maps.Marker({
        position: desLatlon,
        map: map,
        icon: iconDestination + "destination.png"
    });*/

    directionsService.route(request, function(response, status) {
        if (status == google.maps.DirectionsStatus.OK) {
            directionsRenderer.setMap(map);
            directionsRenderer.setDirections(response);
        } else {
            alert("Destination is outside of service area");
        }
    });
    origin.value = "";
    destination.value = "";
}

function initialize() {
    var input = document.getElementById('origin');
    var autocomplete = new google.maps.places.Autocomplete(input);

    var inputDos = document.getElementById('destination');
    var autocompleteDos = new google.maps.places.Autocomplete(inputDos);
}
google.maps.event.addDomListener(window, 'load', initialize);
