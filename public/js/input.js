$(document).ready(function(){
	$('#origin').focus(function() {
	    $(this).attr('placeholder', 'Search address or location')
	}).blur(function() {
	    $(this).attr('placeholder', 'Add pickup location')
	})
	$('#destination').focus(function() {
	    $(this).attr('placeholder', 'Search address or location')
	}).blur(function() {
	    $(this).attr('placeholder', 'Add destination')
	})
});
