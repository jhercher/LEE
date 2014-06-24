
$(document).ready(function(){
    $.ajax('/services').done(function(data){
        $('#services select').empty();
        for(var i in data){
            $('#services select').append('<option value="'+data[i].uri+'" >'+data[i].label+'</option>');
        }
    })
});