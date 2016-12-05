window.addEventListener("load", cargarPagina);
 
var map;
var search = document.getElementById("search");
var direccion = document.getElementById("address");
var mapa = document.getElementById("map");
 
function cargarPagina() {
    
    var myLatlng = new google.maps.LatLng(-12.0552477, -77.0802424);
    var myOptions = {
        zoom: 13,
        center: myLatlng,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(mapa, myOptions);
}
 
function geocodeResult(results, status) {
    if (status == "OK") {
        var mapOptions = {
            center: results[0].geometry.location,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };
        map = new google.maps.Map(mapa, mapOptions);
        map.fitBounds(results[0].geometry.viewport);
        var markerOptions = { position: results[0].geometry.location }
        var marker = new google.maps.Marker(markerOptions);
        marker.setMap(map);
    } else {
        alert("Geocoding no tuvo éxito debido a: " + status);
    }
}