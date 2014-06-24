
$(document).ready(function(){
    $.ajax('/stopwordlists').done(function(data){
        $('#stopwordlists').find('ul').empty();
        for(var i in data){
            $('#stopwordlists').find('ul').append('<li class="list-group-item"><label><input checked type="checkbox" name="stopword" value="'+data[i]+'">'+data[i]+'</label></li>');
        }
    })
});