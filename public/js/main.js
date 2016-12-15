// variables
var accessToken;
var markerOr;
var marker;
var latOr;
var longOr;
var latDes;
var longDes;
var latLon;

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
                        '<span class="price">${{price}}</span>' +
                        '<i class="fa fa-info-circle info" aria-hidden="true" data-toggle="modal" data-target="{{id}}"></i>' +
                    '</div>' +
                '</div>';

var tempModal = '<div class="modal fade" tabindex="-1" role="dialog" id="{{id}}">' +
                    '<div class="modal-dialog" role="document">' +
                        '<div class="modal-body text-center">' +
                        '<div class="modal-1">' +
                          '<span>{{type}}</span><br>' +
                          '<img src="{{image}}"  class="image-car" alt="">' +
                          '<p>{{modText}}</p>' + 
                        '</div>' +
                        '<div class="modal-2">' +
                          '<div class="row">' +
                            '<div class="col-xs-6 text-left">' +
                              '<p>Seats</p>' +
                              '<p>Minimum fare</p>' +
                              '<p>Pickup</p>' +
                              '<p>Per mile</p>' +
                              '<p>Per minute</p>' +
                            '</div>' +
                            '<div class="col-xs-6 text-right">' +
                              '<p>{{seats}}</p>' +
                              '<p>${{min}}</p>' +
                              '<p>${{pickup}}</p>' +
                              '<p>${{mile}}</p>' +
                              '<p>${{minute}}</p>' +
                            '</div>' +
                          '</div>' +
                          '<p class="note">$1.75 Service fee added to all rides</p>' +
                        '</div>' +
                      '</div>' +
                    '<p class="close-modal text-center" data-dismiss="modal">X</p>' +
                  '</div>' +
                '</div>';

var tempLine = '<div class="modal fade" tabindex="-1" role="dialog" id="2">' +
                '<div class="modal-dialog" role="document">' +
                    '<div class="modal-body text-center">' +
                      '<div class="modal-1">' +
                        '<b>Lyft Line</b><br><span>$4 - 6</span><br>' +
                        '<img src="img/lyft-match.png"  class="image-car" alt="">' +
                      '</div>' +
                      '<div class="modal-2">' +
                        '<div class="row text-center">' +
                          '<strong class="lil">Smartly routed</strong>' +
                          '<p class="sml">Lyft Line matches you with others travelling the same way</p>' +
                          '<strong class="lil">Fixed trip price</strong>' +
                          '<p class="sml">Price is set and always less than original Lyft, even if you don´t match with another rider.</p>' +
                        '</div>' +
                      '</div>' +
                    '</div>' +
                  '<p class="close-modal text-center" data-dismiss="modal">X</p>' +
                '</div>' +
               '</div>';

var clientId = 'NIR2JfxWyaiW';
var clientSecret = 'xqIMb-QVcQJWCJE5KMmGcAeofJYA5PgZ';
var database = firebase.database();

var useToken = function (data) {
  var token = data.val();
  if (token == null) {
    requestToken();  
  } else {
    // TO DO ... verificar fecha y usar token
    var savedTimestamp = token.created_at;
    var savedExpiration = token.expires_in;
    var currentTimestamp = new Date().getTime();
    if (currentTimestamp > savedTimestamp + (savedExpiration * 1000)) {
      requestToken();
    } else {
      accessToken = token.token;
    }
  }
};

var requestToken = function () {
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
      accessToken = response.access_token;
      writeDataToFirebase(database, {
        token: accessToken,
        expires_in: response.expires_in,
        created_at: new Date().getTime()
      });
    },
    error: function(error) {
      console.log(error);
    }
  });
};

var writeDataToFirebase = function (database, data) {
  database.ref("tokens/").set(data);
};

var loadPage = function() {

    var tokens = database.ref("tokens/");

    tokens.on('value', useToken);

    if (navigator && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(success, error);
    }

    /*var myLatlng = new google.maps.LatLng(37.7749300, -122.4194200);
    var myOptions = {
        zoom: 9,
        center: myLatlng,
        mapTypeControl: false,
        streetViewControl: false,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(map, myOptions);*/

    $('#button-getestimate').click(getAjax);
    $('#button-getestimate').click(validate);
    $("#origin").click(hideCard);
    $("#button-signupride").click(redirectLyft);
    $("#popup").hide();
    popUp();
};

$(document).ready(loadPage);

var success = function(position) {
    showMap(position.coords.latitude, position.coords.longitude);
};

var error = function(error) {
    console.log(error);
};

var showMap = function(lat, lon) {
    latLon = new google.maps.LatLng(lat, lon);
    var myOptions = {
        zoom: 13,
        center: latLon,
        mapTypeControl: false,
        streetViewControl: false,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(map, myOptions);
};

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
        xhr.setRequestHeader ("Authorization", "bearer " + accessToken);
      },
      success: function(response) {
        console.log(response);
        var name;
        var index;
        var image;
        var text;
        var modText;
        var seats;
        var accessToken;
        var price;
        var sortedArray = response.cost_estimates.sort(function(objX, objY){return objX.estimated_cost_cents_min-objY.estimated_cost_cents_min});
        $.each(sortedArray, function(i, costes) {
            index = costes.display_name.indexOf(" ");
            name = (index > 0) ? costes.display_name.substr(index + 1) : costes.display_name;
            if (costes.ride_type === "lyft_plus") {
                image = "lyft-plus.png";
                text = "6 seats";
                modText = "A supersized ride when you need more space. Fits up to 6 people.";
                seats = "6";
                pickup = "2.00";
            }
            if (costes.ride_type === "lyft_line") {
                image = "lyft-line.png";
                text = "Shared, 2 riders max";
                modText = "Lyft Line matches you with others travelling the same way.";
                seats = "1";
                pickup = "2.00";
            }
            if (costes.ride_type === "lyft") {
                image = "lyft-car.png";
                text = "4 seats";
                modText = "A personal ride for when you need to get to your destination fast. Fits up to 4 people.";
                seats = "4";
                pickup = "3.00";
            }
            if (costes.ride_type === "lyft_premier") {
                text = "High-end,4 seats";
                image = "premier.png";
                modText = "A high-end car whit leather seats and a comfortable interior so you can arrive eith style.";
                seats = "4";
                pickup = "5.00";
            }
            if (costes.estimated_cost_cents_min === costes.estimated_cost_cents_max) {
                price = Math.round(costes.estimated_cost_cents_min/100);
            } else {
                price = Math.round(costes.estimated_cost_cents_min/100) + "-" + Math.round(costes.estimated_cost_cents_max/100);
            }
            $("#calculate").append(template.replace("{{type}}", name)
                                           .replace("{{price}}", price)
                                           .replace("{{image}}", "img/" + image)
                                           .replace("{{text}}", text)
                                           .replace("{{id}}", "#" + parseInt(i+1)));
            $("#modal").append(tempModal.replace("{{type}}", costes.display_name)
                                        .replace("{{min}}", (costes.estimated_cost_cents_min/100).toFixed(2))
                                        .replace("{{mile}}", ((costes.estimated_cost_cents_min/costes.estimated_distance_miles)/100).toFixed(2))
                                        .replace("{{minute}}", ((60*costes.estimated_cost_cents_min/costes.estimated_duration_seconds)/100).toFixed(2))
                                        .replace("{{image}}", "img/" + image)
                                        .replace("{{modText}}", modText)
                                        .replace("{{seats}}", seats)
                                        .replace("{{pickup}}", pickup)
                                        .replace("{{id}}", parseInt(i+1)));
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
                alert("Lyft is not yet available in this region.");
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
    $("#modal").empty();
};

var redirectLyft = function() {
    window.open("https://www.lyft.com/signup", "_blank");
};

var popUp = function() {
  if (window.location.search === "?dl=true") {
      $("#popup").modal("show");
  }
};