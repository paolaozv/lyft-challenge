window.addEventListener("load", cargarPagina);
 
var map;
var button = document.getElementById("button");
var origin = document.getElementById("origin");
var destination = document.getElementById("destination");
var map = document.getElementById("map");
 
function cargarPagina() {
    
    var myLatlng = new google.maps.LatLng(-12.0552477, -77.0802424);
    var myOptions = {
        zoom: 13,
        center: myLatlng,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(map, myOptions);
    button.addEventListener("click", travelToAddress);
}

function travelToAddress(e) {
    e.preventDefault();
    var directionsRenderer = new google.maps.DirectionsRenderer();
    var directionsService = new google.maps.DirectionsService();
    var request = {
        origin: origin.value,
        destination: destination.value,
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true
    };

    directionsService.route(request, function(response, status) {
        if (status == google.maps.DirectionsStatus.OK) {
            directionsRenderer.setMap(map);
            directionsRenderer.setDirections(response);
        } else {
            alert("Destination is outside of service area");
        }
    });
}