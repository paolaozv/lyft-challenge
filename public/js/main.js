window.addEventListener("load", cargarPagina);

var button = document.getElementById("button-getestimate");
var origin = document.getElementById("origin");
var destination = document.getElementById("destination");
var map = document.getElementById("map");
var directionsRenderer = new google.maps.DirectionsRenderer({ 
    polylineOptions: {
             strokeColor: "#9194a1 "
       }
});
var directionsService = new google.maps.DirectionsService();
var latOr;
var longOr;
var latDes;
var longDes;
var desLatlon;
var origLatlon;
var token = null;

function cargarPagina() {

    var clientId = 'ydgWzNZ4qVrS';
    var clientSecret = '04gYKvHBfWi_HS7uuiERZqBiH9V_YWBd';

    $.ajax({
      url: 'https://api.lyft.com/oauth/token',
      type: 'POST',
      data: {
        grant_type: 'client_credentials',
        scope: 'public'
      },
      beforeSend: function (xhr) {
        xhr.setRequestHeader ("Authorization", "Basic " + btoa(clientId + ":" + clientSecret));
      },
      success: function(response) {
        token = response;
        console.log(token);
      },
      error: function(error) {
        console.log(error);
      }
    });

    var myLatlng = new google.maps.LatLng(-12.0788, -77.0655);
    var myOptions = {
        zoom: 13,
        center: myLatlng,
        mapTypeControl: false,
        streetViewControl: false,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(map, myOptions);

    button.addEventListener("click", travelToAddress);
    $('#button-getestimate').click(validate);
    $("#origin").click(hideCard);
}

function travelToAddress(e) {
    e.preventDefault();
    
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
            directionsRenderer.setOptions( { suppressMarkers: true } );
            var pinOrig = '../img/map-pin-blue.svg';
            var marker = new google.maps.Marker({
                position: origLatlon,
                map: map,
                icon: pinOrig
            });
            var pinDes = '../img/map-pin-pink.svg';
            var marker = new google.maps.Marker({
                position: desLatlon,
                map: map,
                icon: pinDes
            });
        } else {
            alert("Destination is outside of service area");
        }
    });

    var geocoder = new google.maps.Geocoder();
    geocoder.geocode({"address": origin.value}, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
            latOr = results[0].geometry.location.lat();
            longOr = results[0].geometry.location.lng();
            origLatlon = new google.maps.LatLng(latOr, longOr);
            console.log(origLatlon);
            console.log(latOr, longOr);
        }
    });

    var geocoderDes = new google.maps.Geocoder();
    geocoderDes.geocode({"address": destination.value}, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
            var latDes = results[0].geometry.location.lat();
            var longDes = results[0].geometry.location.lng();
            desLatlon = new google.maps.LatLng(latDes, longDes);
            console.log(latDes, longDes);
            console.log(desLatlon);
        }
    });

    $.ajax({
      url: 'https://api.lyft.com/v1/cost',
      type: 'GET',
      data: {
        start_lat: latOr,
        start_lng: longOr,
        end_lat: latDes,
        end_lng: longDes
      },
      beforeSend: function (xhr) {
        xhr.setRequestHeader ("Authorization: bearer" + token);
      },
      success: function(response) {
        console.log(response);
      },
      error: function(error) {
        console.log(error);
      }
    });
}

function initialize() {
    var input = document.getElementById('origin');
    var autocomplete = new google.maps.places.Autocomplete(input);

    var inputDos = document.getElementById('destination');
    var autocompleteDos = new google.maps.places.Autocomplete(inputDos);
}

google.maps.event.addDomListener(window, 'load', initialize);

//Validate inputs and show type of rides
var validate = function() {
    var originVal = $("#origin").val().trim().length;
    var destinationVal = $("#destination").val().trim().length;
    if (originVal > 0 && destinationVal > 0) {
        $('#signup-ride').addClass('showRides');
        $('#button-getestimate').addClass('hideButton');
    }
    // else{
    //     alert("You must insert an origin and destination location");
    // }
};

//Blur background
$('.info').click(function(){
    $('.wrapper').addClass('bg-blur');
});
$('.close-modal').click(function(){
    $('.wrapper').removeClass('bg-blur');
});


var hideCard = function() {
    $("#origin").val("");
    $("#destination").val("");
    $('#signup-ride').removeClass("showRides");
    $('#button-getestimate').removeClass("hideButton");
};