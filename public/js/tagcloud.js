
$(document).ready(function(){
    var concepts = [];
    // min max for calculation of fontsize/css class
    var min = 1;
    var max = 1;

    // sorting begin
    initialSorting();
    //sorting end

    $('#concepts li').each(function(index, value){

        // find concept id
        var concept = $(value).find('.concept')[0];
        // find concept name
        var conceptName = $(value).find('.concept-name')[0].text;

        var key = concept.text;

        if(!concepts[key]){ // concept.text = Concept ID (Number)
            concepts[key] = {
                key:key,
                name:conceptName,
                count:0,
                url:concept.href,
                values:[] // prepare for accordeon
            };
        }

        // calculate font size (css class name tag1-tag10)
        concepts[key]['count']++;
        if(max < concepts[key]['count']){
            max = concepts[key]['count'];
        }
        //prepare for accordeon
        concepts[key]['values'].push(value.outerHTML);
        //console.log('concept',concept.href);
    });
    showStructuredResults(concepts);

    $("#tagcloud-container").append('<ul id="tagcloud"></ul>');

    //copy array to a sortable one
    concepts = sortByCount(concepts);

    for(var i in concepts ){
        var size = concepts[i]['count'] * 10 / max;
        size = parseInt(size);
        $('#tagcloud').append('<li class="tag tag'+ size +'"><a data-id="'+concepts[i]['key'].replace('(','').replace(')','').trim()+'" class="concept-name" href="'+concepts[i]['url']+'" class="name">'+ concepts[i]['name'] +'</a> <span class="count badge">'+ concepts[i]['count'] +'</span></li>');
    }


});

var SearchResult = function(liHtml){
    this.html = liHtml.outerHTML;
    this.text = $(liHtml).text().toLowerCase();
    return this;
}

function initialSorting(){
    var searchResultArray = [];
    $('#concepts li').each(function(index, value){

        // append to sortable array
        searchResultArray.push(new SearchResult(value));
    });

    searchResultArray.sort(function(a,b){
        if(a.text < b.text) return -1;
        if(a.text > b.text) return 1;
        return 0;
    });

    //console.log(searchResultArray);

    $('#concepts').empty();

    for(var i in searchResultArray){
        $('#concepts').append(searchResultArray[i].html);
    }
}

function sortByCount(concepts){
    var sortable = [];

    for(var i in concepts){
        sortable.push(concepts[i]);
    }
    // sort by count descending
    sortable.sort(function(a,b){
        return b.count - a.count;
    });

    return sortable;
}

function showStructuredResults(concepts){
    $('#concepts').empty();
    console.dir(concepts);

    for(var i in concepts){
        var actVal = concepts[i];
       // console.log(actVal,'\n');
        if(actVal.count > 1){
            var id = actVal.url.split('/').pop();
            var gndLink = '<small>(<a target="_blank" class="concept" data="'+id+'" href="'+actVal.url+'">'+id+'</a>)</small>';
            var descSpan = '<span class="more" data="'+id+'"> ( + ) <span id="gndDesc'+id+'" class="hidden description"></span></span>';
            var expand = '<span class="expand"> + </span>'
            var a = '<a>'+actVal['name']+'</a>';//.append( ' ['+ actVal.count +'x] ' + gndLink + descSpan);


           // var button  = $('<button>+</button>').append(a);
            var li  = $('<li>'+a+'</li>').append( ' ['+ actVal.count +'x] ' + gndLink + descSpan);//.append(a);
            var ul = $('<ul></ul>');
            ul.css({display:'none'});
            for(var h in actVal['values']){
                ul.append(actVal['values'][h]);
            }

            li.append(ul);
            //button.append(ul);

            $('#concepts').append(li);


            li.click(function(){
                //alert('click');
                $(this).find('ul').toggle();
            });
        }else{
            $('#concepts').append(actVal['values'][0]);
        }

    }
}
