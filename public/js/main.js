window.addEventListener("load", cargarPagina);

var button = document.getElementById("button-getestimate");
var origin = document.getElementById("origin");
var destination = document.getElementById("destination");
var map = document.getElementById("map");
var directionsRenderer = new google.maps.DirectionsRenderer({
    polylineOptions: {
             strokeColor: "#352384"
       }
});
var directionsService = new google.maps.DirectionsService();
var latOr;
var longOr;
var latDes;
var longDes;
var access_token = null;

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
        access_token = response.access_token;
        console.log(access_token);
      },
      error: function(error) {
        console.log(error);
      }
    });

    var myLatlng = new google.maps.LatLng(37.7749300, -122.4194200);
    var myOptions = {
        zoom: 9,
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

    $.ajax({
      url: 'https://api.lyft.com/v1/cost',
      data: {
        start_lat: Number(latOr),
        start_lng: Number(longOr),
        end_lat: Number(latDes),
        end_lng: Number(longDes)
      },
      beforeSend: function (xhr) {
        xhr.setRequestHeader ("Authorization", "bearer " + access_token);
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
    autocomplete.addListener('place_changed', function() {
        
        
        var marker = new google.maps.Marker({
            map: map,
            anchorPoint: new google.maps.Point(0, -29)
        });
        marker.setVisible(false);
        var place = autocomplete.getPlace();
        if (!place.geometry) {
          window.alert("Autocomplete's returned place contains no geometry");
          return;
        }

        if (place.geometry.viewport) {
          map.fitBounds(place.geometry.viewport);
        } else {
          map.setCenter(place.geometry.location);
          map.setZoom(17);
        }
        marker.setIcon(({
          url: '../img/map-pin-blue.png'
        }));
        marker.setPosition(place.geometry.location);
        marker.setVisible(true);
        console.log(place.icon);
        

    });

    autocompleteDos.addListener('place_changed', function() {
        
        
        var marker = new google.maps.Marker({
            map: map,
            anchorPoint: new google.maps.Point(0, -29)
        });
        marker.setVisible(false);
        var place = autocompleteDos.getPlace();
        if (!place.geometry) {
          window.alert("Autocomplete's returned place contains no geometry");
          return;
        }

        if (place.geometry.viewport) {
          map.fitBounds(place.geometry.viewport);
        } else {
          map.setCenter(place.geometry.location);
          map.setZoom(17); 
        }
        marker.setIcon(({
          url: '../img/map-pin-pink.png'
        }));
        marker.setPosition(place.geometry.location);
        marker.setVisible(true);
        console.log(place.geometry.location);
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
        } else {
            alert("Destination is outside of service area");
        }

    });
    });


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



