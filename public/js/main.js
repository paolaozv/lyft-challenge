// variables
var markerOr;
var marker;
var latOr;
var longOr;
var latDes;
var longDes;

var button = document.getElementById("button-getestimate");
var origin = document.getElementById("origin");
var destination = document.getElementById("destination");
var map = document.getElementById("map");
var directionsService = new google.maps.DirectionsService();
var directionsRenderer = new google.maps.DirectionsRenderer({
    polylineOptions: {
             strokeColor: "#352384"
    }
});
var access_token = "gAAAAABYSIIs75nsHenxaV3uCS8m-XfJ-VqlmYCiEoNSI9cLnpH4PcYWWDRTT541OlefRzA8lZ7OSMkiXeneOd17guoUVYVHbm8SAgPIi94RLv5tpWmusfdQuMPLWHZKDHUzYNSBegUJIDDEadnYVD2WoizFOpA_vCMfhbvKRezNVF9cyuGvTtnpbUlcd5i7LzpflUCshSObatJmD7xOHavTJ8qkn9rwaA==";

var template = '<hr class="sep">' +
               '<div class="row">' +
                    '<div class="car image">' +
                        '<img src="{{image}}" alt="">' +
                    '</div>' +
                    '<div class="content text-left">' +
                        '<p class="title">{{type}}</p>' +
                        '<span class="status">{{text}}</span>' +
                    '</div>' +
                    '<div class="prices text-right">' +
                        '<span class="price">${{min}}-{{max}}</span>' +
                        '<i class="fa fa-info-circle info" aria-hidden="true" data-toggle="modal" data-target="{{id}}"></i>' +
                    '</div>' +
                '</div>';

var loadPage = function() {
   /* var database = firebase.database();

    function writeData(database, token) {
        database.ref("tokens/").set(token);
        console.log("Token saved");
    }

    var createAt = new Date();
    writeData(database, {
        token: "gAAAAABYSIIs75nsHenxaV3uCS8m-XfJ-VqlmYCiEoNSI9cLnpH4PcYWWDRTT541OlefRzA8lZ7OSMkiXeneOd17guoUVYVHbm8SAgPIi94RLv5tpWmusfdQuMPLWHZKDHUzYNSBegUJIDDEadnYVD2WoizFOpA_vCMfhbvKRezNVF9cyuGvTtnpbUlcd5i7LzpflUCshSObatJmD7xOHavTJ8qkn9rwaA==",
        expires_in: 86400
    });*/

    var clientId = 'NIR2JfxWyaiW';
    var clientSecret = 'xqIMb-QVcQJWCJE5KMmGcAeofJYA5PgZ';
    /*window.location.href = "index.html" + "?dl=true";*/

   /* if (window.location.href = "index.html" + "?dl=true") {
        $("#popup").show();
    } else {
        $("#popup").hide();
    }*/

    /*$.ajax({
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
        access_token = "gAAAAABYRy6WdpdDRDzBado0QL4XhC3hBBAFzypCYCQUMRYLWSSomzs4Fw6dVTj9AnMCmP2LB8vj4apnu2HBtUfHCIhglfPcLVISIkmRRGa6yL5YwvovdkxvIObmONhG8S8L-_cStnls9-MBjjtp8e2B_53e-xmkHxD69sXzhzDKQSlGTWC3zThobBb_FltN3tZ1W9eXRSSfjjjrnYmsJRLvCw8E4VpJjA==";
        console.log(access_token);
      },
      error: function(error) {
        console.log(error);
      }
    });*/

    var myLatlng = new google.maps.LatLng(37.7749300, -122.4194200);
    var myOptions = {
        zoom: 9,
        center: myLatlng,
        mapTypeControl: false,
        streetViewControl: false,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(map, myOptions);

    $('#button-getestimate').click(getAjax);
    $('#button-getestimate').click(validate);
    $("#origin").click(hideCard);
    /*$(".downpop").click(redirect);*/
    $("#button-signupride").click(redirectLyft);
};

$(document).ready(loadPage);

/*var redirect = function() {
    window.location.href = "index.html";
};*/

var getAjax = function(e) {
    e.preventDefault();
    console.log(latDes);
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
        var image;
        var text;
        $.each(response.cost_estimates, function(i, costes) {
            if (costes.ride_type === "lyft_plus") {
                image = "lyft-plus.png";
                text = "6 seats";
            }
            if (costes.ride_type === "lyft_line") {
                image = "lyft-line.png";
                text = "Shared, 2 riders max";
            }
            if (costes.ride_type === "lyft") {
                image = "lyft-car.png";
                text = "4 seats";
            }
            if (costes.ride_type === "lyft_premier") {
                text = "High-end,4 seats";
                image = "premier.png";
            }
            $("#calculate").append(template.replace("{{type}}", costes.display_name)
                                           .replace("{{min}}", (costes.estimated_cost_cents_min/100))
                                           .replace("{{max}}", (costes.estimated_cost_cents_max/100))
                                           .replace("{{image}}", "img/" + image)
                                           .replace("{{text}}", text)
                                           .replace("{{id}}", "#" + parseInt(i+1)));
        });
      },
      error: function(error) {
        console.log(error);
      }
    }); 
};

var initialize = function() {
    var input = document.getElementById('origin');
    var autocomplete = new google.maps.places.Autocomplete(input);

    var inputDos = document.getElementById('destination');
    var autocompleteDos = new google.maps.places.Autocomplete(inputDos);
    autocomplete.addListener('place_changed', function() {
        directionsRenderer.setMap(null);
        
        if (markerOr != null) {
            markerOr.setMap(null);    
        }
        if (marker != null) {
            marker.setMap(null);
        }
        
        markerOr = new google.maps.Marker({
            map: map,
            anchorPoint: new google.maps.Point(0, -29)
        });
        markerOr.setVisible(false);
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
        markerOr.setIcon(({
          url: '../img/map-pin-blue.png'
        }));
        markerOr.setPosition(place.geometry.location);
        markerOr.setVisible(true);

        var geocoder = new google.maps.Geocoder();
        geocoder.geocode( { "address": origin.value}, function(results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
                latOr = results[0].geometry.location.lat();
                longOr = results[0].geometry.location.lng();
                console.log(latOr, longOr);
            } 
        });

    });

    autocompleteDos.addListener('place_changed', function() {
        if (marker != null) {
            marker.setMap(null);    
        }
        
        marker = new google.maps.Marker({
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
        
        var geocoder = new google.maps.Geocoder();
            geocoder.geocode( { "address": destination.value}, function(results, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                    latDes = results[0].geometry.location.lat();
                    longDes = results[0].geometry.location.lng();
                    console.log(latDes, longDes);
                } 
        });

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
};

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
    $("#calculate").empty();
};

var redirectLyft = function() {
    window.open("https://www.lyft.com/signup", "_blank");
};