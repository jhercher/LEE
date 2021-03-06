var express = require('express');
var fs = require('fs');
var router = express.Router();
request = require('request');
var url = require('url');

// default URI for enhancer service - define additional services (e.g. by chain) in /res/services.json ;
var uri = 'http://localhost:8080/enhancer/';

/* TODO: move stopwordFilter to module. */
var stopwordFilterGerman = function (textinput, stopwordlist) {
    console.log('init Stoppwort filter');
    var find = ',' // for multiply replace values in arrays [1]
        , regex = new RegExp(find, 'g')
        , replace = ' ';

    // functions to use regex safely [3]
    var escapeRegExp = function (string) {
        return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
    };
    var replaceAll = function (string, find, replace) {
        return string.replace(new RegExp(escapeRegExp(find), 'g'), replace);
    };

    var stopwords = readStopWords(stopwordlist);
    //console.log('stopwords', stopwords);
    //text to process
    var ein = textinput
        , output = [];

    // filter stoppwords from output
    var removeStopwords = function (text, stopwordArr, output) {
        var input = text.split(' ')
            , i = input.length;
        while (i--) {
            var index = stopwordArr.indexOf(input[i].toLowerCase());
            if (index !== -1) { //console.log(input[i] +' -> remove' );
            } else { // console.log(input[i] +' -> output' );
                output.push(input[i]);
            }
        }
        return output.reverse();
    };
    var out = removeStopwords(ein, stopwords, output).toString()
        , cleanText = replaceAll(out, find, replace);
    // Debug // console.log(cleanText);
    //console.log('cleanText', cleanText, out);
    return cleanText;
};

/**
 * reads selected stopword files and merges them into an array
 * @param {string | array} files
 * @returns {Array} stopwords
 */
function readStopWords(files){
    //console.log('files... ',files);
    //files = files.split(',');

    if(typeof(files) !== 'object'){
        console.log('kein object');
        files = [files];
    }

    var stopwords = [];

    for(var i in files){
        var file = './res/stopwords/' + files[i].toString();
        //console.log(i,file,files[i]);
        var data = fs.readFileSync(file, 'utf-8');

        data = data.split(/\r\n|\r|\n/g);

        stopwords = stopwords.concat(data);

    }
    //stopwords = stopwords.unique();

    for(var i in stopwords){
        stopwords[i] = stopwords[i].toLowerCase();
    }

    //console.log(stopwords);
    return stopwords;
}

/**
 * reads all file names in directory /res/stopwords
 */
router.get('/stopwordlists', function (req, response) {
    var dir = './res/stopwords';
    var files = fs.readdirSync(dir);
    response.send(files);
});

/**
 * reads the content of the file /res/services.json
 * this file contains the available services for searching
 */
router.get('/services', function (req, response) {
    var file = './res/services.json';

    fs.readFile(file, 'utf8', function (err, data) {
        if (err) {
            console.log('Error: ' + err);
            return;
        }

        data = JSON.parse(data);

        //console.dir(data);

        response.send(data);
    });
});

router.post('/', function (req, response) {
//var text = req.params.text;
    var querytext;
    console.log('post called');
    if (req.param('analyze')){
        console.log("param set to " + req.param('analyze'));
         querytext = req.param('analyze');
    }else {console.log("no param!");
         querytext = "please provide text to analyze";

    }

    /* escape/remove special chars*/
    function escapeSpecialChars(text) {
        return text
            .replace(/&/g, " ")
            .replace(/</g, "")
            .replace(/>/g, "")
            .replace(/"/g, "")
            .replace(/'/g, "")
            .replace(/;/g, "")
            .replace(/%/g, " ")
            .replace(/„/g, "")
            .replace(/“/g, "")
            .replace(/‚/g, "")
            .replace(/‘/g, "");
    }

    var ctext = escapeSpecialChars(querytext);
    if(req.body.stopword){
        var ctext2 = stopwordFilterGerman(ctext, req.body.stopword || [] );
    }else{
        var ctext2 = ctext;
    }

    console.log('req', req.body);

    if(req.body.service){
        uri = req.body.service;
    }

    /*Sends text to enhancment service (chain), e.g. http://localhost:8080/chain/default  */
    var options = { method: 'POST', uri: uri, headers: {Accept: 'application/json', 'Content-type': 'text/plain'}, auth: { user: 'admin', pass: 'admin' }, body: ctext2
        //, proxy: 'http://localhost:9999'
    };
    var r = request(options, function (err, httpResponse, body) {
        if (err) return console.error('upload failed:', err);
        if (httpResponse.statusCode == 200 && typeof body !== "undefined") { //console.log('Upload successful!  Server responded with:', body);

            var props = JSON.parse(body)['@graph'];
            //console.log('props',props);
            response.render('results.ejs',
                { //object for entity.props
                      props: props
                    , text: ctext.trim()
                    , primosearch: ' http://vs66.kobv.de:1701/primo_library/libweb/action/search.do?fn=search&mode=Basic&tab=fub&vid=FUB&tb=t&vl%28freeText0%29='
                }
            );
        } else {
            console.log('Sorry no concepts for your text: http-Status' + httpResponse.statusCode +"\n Body: \n");

        }

    });

});
router.get('/', function (req, response) {
    response.render('results.ejs')
});
router.get('/docs', function (req, response) {
    response.render('doc1.ejs')
});
/*
* queries the zbw fuseki endpoint to fetch additional concept descriptions
*  @param {string } gndId
 * @returns {Array} of categories, e.g. "3.7b"
 * @required var dnbCats
 */

router.get('/zbw/:gnd',function(req,response){
    console.log('zbw client called');
//var text = req.params.text;
    var gndid = req.params.gnd;
    console.log('>>>' + gndid);
    var fuseki = 'http://zbw.eu/beta/sparql/gnd/query?query=select%20*%20%20where%20%7B%20%20%20%3Chttp%3A%2F%2Fd-nb.info%2Fgnd%2F'+gndid+'%3E%20%3Fp%20%3Fo%20%7D&output=json';
    var options = { method: 'GET'
        , uri: fuseki
        , headers: {Accept: 'application/json'}
        // , proxy: 'http://localhost:9999'
    };
    var conceptInfo = [];
    var r = request(options, function(err, httpResponse,body) {
        if (err) return console.error('upload failed:', err);
        if (httpResponse.statusCode == 200 && typeof body !== "undefined"){ //console.log('Upload successful!  Server responded with:', body);
            var props = JSON.parse(body);

            var bindings = props['results'].bindings;
            var gndClassObjectArr = [];
            var gndClassLabelArr = [];
            //console.log(bindings);
            for(var i in bindings){
                if(bindings[i].o['value'] && bindings[i].p['value'] === "http://d-nb.info/standards/elementset/gnd#gndSubjectCategory"){
                    console.log(bindings[i].o['value']);
                    gndClassObjectArr.push(bindings[i].o['value'].split('#')[1]);
                }
                else if(bindings[i].o['value'] && bindings[i].p['value'] === "http://d-nb.info/standards/elementset/gnd#preferredNameForTheSubjectHeading"){
                    var prefName = bindings[i].o['value'];
                }
                else if(bindings[i].o['value'] && bindings[i].p['value'] === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"){
                    var conceptType = bindings[i].o['value'].split('#')[1];
                }
                else {
                    //nothing
                }

            }
            for (var cat in gndClassObjectArr){
             // get labels from arr dnbConcepts.class
             //stopwordFilterGerman(gndClassObjectArr[i], req.body.catLabel || [])
             console.log ("[" +gndClassObjectArr[cat] + ' , ' + dnbCats[gndClassObjectArr[cat]] +"]");
            // label = (gndClassObjectArr[cat] +  ' >> ' + dnbCats[gndClassObjectArr[cat]]);
             label = {'cat' : gndClassObjectArr[cat]  , 'label' : dnbCats[gndClassObjectArr[cat]]};

                gndClassLabelArr.push(label);
             }

            var xconcept = [
                            { id : gndid , name : prefName, type : conceptType , categories : gndClassLabelArr }
                           ];
            response.json(xconcept); //console.log('==>' + myCat);

        }else{
            console.log('Sorry no GND class found') ;
        }

    });
});

router.get('/catLabel/:dnbCat', function (req, data) {
    var catNum = req.params.dnbCat;
    console.log('init with Class: ' + catNum)
    // N3 Parser //
        'use strict';
        var N3 = require('n3'),
            fs = require('fs');

        var parser = N3.Parser(), store = N3.Store(), N3Util = N3.Util,
            prefLabel,
            turtleFile;

       // TODO: not async!
       // TODO: no Buffer!
        turtleFile = fs.readFileSync('./res/store/subjectCategories.ttl', 'utf8');

        var mySubject = "http://d-nb.info/standards/vocab/gnd/gnd-sc#" + catNum;
        parser.parse(turtleFile, function (error, triple) {
            if (error) {
                console.error(error);
            }
            else if (triple) {
                store.addTriple(triple); //console.log(triple);
            }
            // called if we parsed the whole .ttl
            else {
                var labels = store.find(mySubject, 'http://www.w3.org/2004/02/skos/core#prefLabel', null);
                labels.map(function (label) {
                    prefLabel = N3Util.getLiteralValue(label.object);
                    //myCat = prefLabel;
                });
            //returns prefLabel of a gnd category
            data.json(prefLabel); //console.log('==>' + myCat);
            }
        });
});
/*
this object is a workaround to fetch descriptions for DNB Category id's,
its required until /catLabel/:dnbCat works in async from  /zbw/:gnd route
*/
var dnbCats = {
    "00": "Unspezifische Allgemeinwörter",
    "00m": "Maschinell eingespielte Datensätze(Platzhalter)",
    "00p": "Sachlich nicht klassifizierbare Personen",
    "1": "Allgemeines, InterdisziplinäreAllgemeinwörter",
    "2": "Schrift, Buch, Presse",
    "2.1": "Schrift, Handschriftenkunde",
    "2.1p": "Personen zu Schrift, Handschriftenkunde",
    "2.2": "Buchwissenschaft, Buchhandel",
    "2.2p": "Personen zu Buchwissenschaft, Buchhandel",
    "2.3": "Presse",
    "2.3p": "Personen zu Presse",
    "3": "Religion",
    "3.1": "Allgemeine und vergleichende Religionswissenschaft,Nichtchristliche Religionen",
    "3.1p": "Personen zu allgemeiner und vergleichenderReligionswissenschaft, Personen zu nichtchristlichen Religionen",
    "3.2-3.6": "Christentum",
    "3.2": "Bibel",
    "3.2a": "Altes Testament",
    "3.2aa": "Teile des Alten Testamentes",
    "3.2b": "Neues Testament",
    "3.2ba": "Teile des Neuen Testamentes",
    "3.2p": "Personen der Bibel",
    "3.3": "Kirchengeschichte",
    "3.3a": "Kirchengeschichte: Antike",
    "3.3b": "Kirchengeschichte: Mittelalter",
    "3.3c": "Kirchengeschichte: Neuzeit",
    "3.4": "Systematische Theologie",
    "3.4a": "Systematische Theologie (Allgemeines),Fundamentaltheologie",
    "3.4b": "Dogmatik",
    "3.4c": "Theologische Anthropologie, Christliche Ethik",
    "3.5": "Praktische Theologie",
    "3.5a": "Liturgik, Frömmigkeit",
    "3.5b": "Homiletik, Katechetik",
    "3.5ba": "Homiletik",
    "3.5bb": "Katechetik, Christliche Erziehung, KirchlicheBildungsarbeit",
    "3.5c": "Seelsorge, Mission",
    "3.5ca": "Seelsorge",
    "3.5cb": "Mission, Kirchliche Sozialarbeit",
    "3.6": "Kirche und Konfession",
    "3.6a": "Katholische Kirche",
    "3.6b": "Evangelische Kirchen",
    "3.6c": "Ostkirchen und andere christliche Religionsgemeinschaften undSekten",
    "3.6p": "Personen zu Kirchengeschichte, Systematischer und PraktischerTheologie, Kirche und Konfession",
    "4": "Philosophie",
    "4.1": "Philosophie (Allgemeines)",
    "4.2": "Philosophiegeschichte",
    "4.3": "Erkenntnistheorie, Logik",
    "4.4": "Metaphysik",
    "4.5": "Ethik, Philosophische Anthropologie,Sozialphilosophie",
    "4.6": "Ãsthetik",
    "4.7": "Kulturphilosophie",
    "4.7p": "Personen zu Philosophie",
    "5": "Psychologie, Esoterik",
    "5.1": "Psychologie allgemein, Tests",
    "5.1a": "Psychologie (Allgemeines), ExperimentellePsychologie",
    "5.1b": "Psychologische Diagnostik, Tests",
    "5.2": "Entwicklungspsychologie, VergleichendePsychologie",
    "5.3": "Sozial-, Kultur- und Völkerpsychologie",
    "5.4": "Tiefenpsychologie",
    "5.5": "Angewandte Psychologie, Psychohygiene",
    "5.5p": "Personen zu Psychologie",
    "5.6": "Parapsychologie",
    "5.7": "Esoterik",
    "5.7p": "Personen zu Parapsychologie, Esoterik",
    "6": "Kultur, Erziehung, Bildung, Wissenschaft",
    "6.1": "Kultur und Künste, Geistes- undKulturgeschichte",
    "6.1a": "Kultur, Künste allgemein",
    "6.1b": "Geistes- und Kulturgeschichte",
    "6.1p": "Personen zu Kultur und Künsten, Geistes- undKulturgeschichte",
    "6.2": "Bildungswesen allgemein, Geschichte desBildungswesens",
    "6.2a": "Bildungswesen (Allgemeines)",
    "6.2b": "Geschichte des Bildungswesens",
    "6.3": "Schule, Berufsausbildung",
    "6.3a": "Schule",
    "6.3b": "Berufsausbildung",
    "6.4": "Unterricht",
    "6.4p": "Personen zu Bildungswesen",
    "6.5": "Wissenschaft",
    "6.6": "Hochschule",
    "6.7": "Bibliothek, Information und Dokumentation",
    "6.7p": "Personen zu Bibliothek, Information undDokumentation",
    "6.8": "Archiv, Museum",
    "6.8p": "Personen zu Archiv, Museum",
    "7": "Recht, Allgemeine Verwaltung",
    "7.1": "Recht allgemein, Ãffentliches Recht allgemein, Privatrechtallgemein, Rechtsvergleich",
    "7.1a": "Recht allgemein, Rechtsphilosophie",
    "7.1b": "Rechtsvergleich",
    "7.2": "Rechtsgeschichte, Verfassungsgeschichte",
    "7.2a": "Rechtsgeschichte, Verfassungsgeschichte:Altertum",
    "7.2b": "Rechtsgeschichte, Verfassungsgeschichte:Mittelalter",
    "7.2c": "Rechtsgeschichte, Verfassungsgeschichte:Neuzeit",
    "7.3": "Staatsrecht, Verfassungsrecht",
    "7.4": "Allgemeines Verwaltungsrecht",
    "7.5": "Besonderes Verwaltungsrecht",
    "7.5a": "Dienstrecht (auch Richter)",
    "7.5b": "Kommunalrecht",
    "7.5c": "Baurecht, Raumordnung, Bodenrecht, Umweltrecht,Naturschutzrecht, Denkmalschutz",
    "7.5d": "Kulturrecht, Presserecht, Rundfunkrecht, Bildungswesen undForschung",
    "7.5e": "StraÃen- und Wegerecht, Verkehrsrecht,Telekommunikationsrecht",
    "7.5f": "Wehrrecht",
    "7.6": "Polizeirecht, Gesundheitsrecht, Kriminologie",
    "7.6a": "Polizeirecht, Ordnungsrecht",
    "7.6b": "Gesundheitsrecht",
    "7.6c": "Kriminologie",
    "7.7": "Strafrecht, Strafvollzug",
    "7.7a": "Strafrecht",
    "7.7b": "Strafvollzug",
    "7.8": "Rechtspflege, Prozessrecht, Rechtsmedizin",
    "7.8a": "Rechtspflege, Prozessrecht",
    "7.8b": "Rechtsmedizin",
    "7.9": "Finanzrecht, Steuerrecht, Zollrecht",
    "7.9a": "Finanzrecht",
    "7.9b": "Steuerrecht, Zollrecht",
    "7.10": "Wirtschaftsrecht, Gewerblicher Rechtsschutz",
    "7.10a": "Wirtschaftsrecht, Wirtschaftsaufsicht",
    "7.10b": "Gewerblicher Rechtsschutz, Urheberrecht",
    "7.11": "Arbeitsrecht, Sozialrecht, Gebührenrecht",
    "7.11a": "Arbeitsrecht, Sozialrecht, Recht derTarifverträge",
    "7.11b": "Berufsrecht",
    "7.11c": "Gebührenrecht",
    "7.12": "Bürgerliches Recht",
    "7.12a": "Allgemeiner Teil des Bürgerlichen Rechts",
    "7.12b": "Schuldrecht",
    "7.12c": "Sachenrecht",
    "7.12d": "Familienrecht",
    "7.12e": "Erbrecht",
    "7.13": "Religionsrecht, Kirchenrecht,Staatskirchenrecht",
    "7.14": "Internationales Recht (einschlieÃlich Völkerrecht und Rechtder Europäischen Gemeinschaften, Europäischen Union), Kollisionsrecht",
    "7.14p": "Personen zu Recht",
    "7.15": "Ãffentliche Verwaltung, Geschichte der ÃffentlichenVerwaltung",
    "7.15a": "Ãffentliche Verwaltung, Ãffentlicher Dienst",
    "7.15b": "Geschichte der Ãffentlichen Verwaltung",
    "7.15p": "Personen zu öffentlicher Verwaltung",
    "8": "Politik, Militär",
    "8.1": "Politik (Allgemeines), Politische Theorie",
    "8.1p": "Personen (Politologen, Staatstheoretiker)",
    "8.2": "Innenpolitik, Parteien",
    "8.2a": "Innenpolitik",
    "8.2b": "Parteien, Politische Organisationen",
    "8.3": "AuÃenpolitik",
    "8.4": "Militär",
    "8.4p": "Personen zu politischer Theorie, Militär",
    "9": "Soziologie, Gesellschaft, Arbeit,Sozialgeschichte",
    "9.1": "Sozialgeschichte",
    "9.1a": "Sozialgeschichte: Altertum",
    "9.1b": "Sozialgeschichte: Mittelalter",
    "9.1c": "Sozialgeschichte: Neuzeit",
    "9.2": "Sozialwissenschaften allgemein, Soziologische Theorien,Statistik in den Sozialwissenschaften",
    "9.2a": "Sozialwissenschaften allgemein, SoziologischeTheorien",
    "9.2b": "Methoden und Techniken der empirischen Sozialforschung,Statistik in den Sozialwissenschaften, Mathematische Statistik",
    "9.3": "Sozialstruktur, Soziales Leben, Bevölkerung",
    "9.3a": "Soziales Leben, Bevölkerung (Allgemeines), Gesellschaftallgemein",
    "9.3b": "Bevölkerung, Sozialstruktur, Soziale Situation, SozialeBewegungen",
    "9.3c": "Gruppe, Organisationssoziologie, Interaktion",
    "9.3d": "Sozialisation, Sozialverhalten",
    "9.3e": "Kommunikation, Meinungsbildung",
    "9.4": "Arbeit, Arbeitswelt, Gewerkschaften",
    "9.4a": "Arbeit",
    "9.4ab": "\"Einzelne Berufe, Tätigkeiten, Funktionen;Religionszugehörigkeit, Weltanschauung\"",
    "9.4b": "Mitbestimmung, Gewerkschaften",
    "9.5": "Sozialpolitik, Sozialarbeit",
    "9.5a": "Sozialpolitik, Entwicklungshilfe",
    "9.5b": "Sozialversicherung und GesetzlicheKrankenversicherung",
    "9.5c": "Sozialarbeit, Sozialhilfe",
    "9.5p": "Personen zu Soziologie, Gesellschaft, Arbeit,Sozialgeschichte",
    "10": "Wirtschaft, Verkehr, Umweltschutz,Raumordnung",
    "10.1": "Wirtschaftsgeschichte",
    "10.1a": "Wirtschaftsgeschichte: Altertum",
    "10.1b": "Wirtschaftsgeschichte: Mittelalter",
    "10.1c": "Wirtschaftsgeschichte: Neuzeit",
    "10.1p": "Personen zu Wirtschaftsgeschichte (bis ca.1900)",
    "10.2": "Wirtschaft, Volkswirtschaft",
    "10.2a": "Wirtschaft, Volkswirtschaft (Allgemeines)",
    "10.2aa": "Volkswirtschaft",
    "10.2ab": "Wirtschaftssystem",
    "10.2ac": "Mathematische Methoden, Information,Entscheidung",
    "10.2b": "Haushalt, Verbraucher",
    "10.2c": "Mikroökonomie, Wettbewerb",
    "10.2d": "Konjunktur, Verteilung, Wirtschaftsstruktur",
    "10.2da": "Wirtschaftskreislauf, Konjunktur",
    "10.2db": "Verteilung",
    "10.2dc": "Wirtschaftsstruktur",
    "10.2dp": "Personen zu Wirtschaftswissenschaften",
    "10.2e": "AuÃenwirtschaft, AuÃenhandel",
    "10.2ea": "AuÃenwirtschaft, AuÃenhandelgesamtwirtschaftlich",
    "10.2eb": "AuÃenwirtschaft, AuÃenhandel betrieblich",
    "10.2ep": "Personen zu AuÃenwirtschaft, AuÃenhandel",
    "10.3": "Ãffentliche Aufgaben, Ãffentliche Wirtschaft, Energie- undRohstoffwirtschaft",
    "10.3a": "Ãffentliche Aufgaben",
    "10.3b": "Ãffentliche Wirtschaft, Abfallwirtschaft,Gesundheitsökonomie",
    "10.3c": "Energie- und Wasserwirtschaft",
    "10.3d": "Rohstoffwirtschaft",
    "10.3p": "Personen zu öffentlichen Aufgaben, Ãffentlicher Wirtschaft,Energie- und Rohstoffwirtschaft",
    "10.4": "Wirtschaftspolitik",
    "10.4p": "Personen zu Wirtschaftspolitik",
    "10.5": "Finanzwirtschaft, Finanzpolitik",
    "10.5p": "Personen zu Finanzwirtschaft, Finanzpolitik",
    "10.6": "Telekommunikation und Verkehr, Fremdenverkehr",
    "10.6a": "Telekommunikation und Verkehr",
    "10.6b": "Fremdenverkehr, Hotel- und Gaststättengewerbe",
    "10.6p": "Personen zu Telekommunikation und Verkehr,Fremdenverkehr",
    "10.7": "Umweltschutz, Raumordnung,Landschaftsgestaltung",
    "10.7a": "Umweltschutz, Umweltbelastung",
    "10.7b": "Raumordnung, Stadtplanung,Landschaftsgestaltung",
    "10.7p": "Personen zu Umweltschutz, Raumordnung,Landschaftsgestaltung",
    "10.8": "Bau und Boden",
    "10.8a": "Ãffentliche und private Bautätigkeit, Bau- undBodenpolitik",
    "10.8b": "Bauwirtschaft, Baubetrieb und Bodenmarkt",
    "10.8p": "Personen zu Bau, Boden",
    "10.9": "Geld, Bank, Börse",
    "10.9a": "Geldtheorie, Geldpolitik, Währung",
    "10.9b": "Bank",
    "10.9c": "Kapitalmarkt, Börse, Kapitalanlage",
    "10.9p": "Personen zu Geld, Bank, Börse",
    "10.10": "Genossenschaft, Gemeinwirtschaft, AlternativeWirtschaft",
    "10.10p": "Personen zu Genossenschaft, Gemeinwirtschaft, AlternativerWirtschaft",
    "10.11": "Betriebswirtschaftslehre",
    "10.11a": "Betriebswirtschaftslehre (Allgemeines), Unternehmen,Management",
    "10.11b": "Mathematische Methoden, Information,Entscheidung",
    "10.11c": "Beschaffung, Produktion",
    "10.11d": "Kosten",
    "10.11e": "Marketing, Wettbewerb",
    "10.11f": "Rechnungswesen, Steuer, Revision",
    "10.11g": "Investition, Finanzierung",
    "10.11h": "Personalpolitik, Arbeitsgestaltung",
    "10.11i": "Büro, Bürokommunikation",
    "10.11m": "Spezielle Informationssysteme, Programme",
    "10.11p": "Personen zu Betriebswirtschaftslehre",
    "10.12": "Gewerbe allgemein, Industrie, Handwerk",
    "10.12a": "Industrie, Industriebetrieb, Handwerk",
    "10.12b": "Einzelne Branchen der Industrie und desHandwerks",
    "10.12p": "Personen zu Gewerbe allgemein, Industrie,Handwerk",
    "10.13": "Handel, Dienstleistung",
    "10.13a": "Handel allgemein, Dienstleistung allgemein",
    "10.13b": "Handel einzelner Branchen, Dienstleistung einzelnerBranchen",
    "10.13p": "Personen zu Handel, Dienstleistung",
    "10.14": "Versicherung",
    "10.14p": "Personen zu Versicherung",
    "10.15": "Werbewirtschaft, Ãffentlichkeitsarbeit",
    "10.15p": "Personen zu Werbewirtschaft,Ãffentlichkeitsarbeit",
    "11": "Sprache",
    "11.1": "Sprache (Allgemeines), Historische Sprachwissenschaft,Sprachliche Technik",
    "11.1a": "Sprache (Allgemeines)",
    "11.1b": "Historische Sprachwissenschaft",
    "11.1c": "Sprachliche Technik",
    "11.2": "Sprachtheorie",
    "11.2a": "Allgemeine Sprachtheorie",
    "11.2b": "Grammatik",
    "11.2c": "Phonetik, Phonologie",
    "11.2p": "Personen zu Sprache",
    "11.3": "Lexikologie, Namenkunde, Fachsprache",
    "11.3a": "Lexikologie",
    "11.3b": "Namenkunde",
    "11.3c": "Fachsprache",
    "11.3d": "Anonymes Werk als Sprachdenkmal",
    "12": "Literatur",
    "12.1": "Literatur (Allgemeines)",
    "12.1a": "Allgemeine Literaturwissenschaft",
    "12.1b": "Literarisches Leben",
    "12.1p": "Personen zu Literaturwissenschaft(Literaturwissenschaftler)",
    "12.2": "Literaturgeschichte",
    "12.2a": "Literaturgeschichte",
    "12.2b": "Anonyme literarische Werke",
    "12.2p": "Personen zu Literaturgeschichte(Schriftsteller)",
    "12.3": "Literaturgattung",
    "12.4": "Literarische Motive, Stoffe, Gestalten",
    "12.4p": "Personen als literarisches Motiv",
    "12.4y": "Geografische Namen als literarisches Motiv",
    "13": "Bildende Kunst, Fotografie",
    "13.1": "Bildende Kunst, Kunstgeschichte, Motive",
    "13.1a": "Bildende Kunst",
    "13.1b": "Kunstgeschichte",
    "13.1bp": "Personen zu Kunstwissenschaft,Kunsthistoriker",
    "13.1c": "Sachliche Motive in der Kunst",
    "13.1cp": "Personen als künstlerisches Motiv",
    "13.1cy": "Geografische Namen als künstlerisches Motiv",
    "13.2": "Plastik",
    "13.2p": "Personen zu Plastik",
    "13.3": "Malerei",
    "13.4": "Zeichnung, Grafik",
    "13.4p": "Personen zu Malerei, Zeichnung, Grafik",
    "13.5": "Fotografie",
    "13.5p": "Personen zu Fotografie",
    "13.6": "Kunsthandwerk",
    "13.6p": "Personen zu Kunsthandwerk",
    "13.7": "Neue Formen der Kunst",
    "13.7p": "Personen zu neuen Formen der Kunst",
    "14": "Musik",
    "14.1": "Musik (Allgemeines), Musikgeschichte",
    "14.2": "Musikalische Form, Musikgattung",
    "14.3": "Musikinstrumentenkunde, Musikinstrumentenbau",
    "14.4": "Systematische und AngewandteMusikwissenschaft",
    "14.4p": "Personen zu Musik",
    "15": "Theater, Tanz, Film, Rundfunk",
    "15.1": "Theater, Tanz",
    "15.1p": "Personen zu Theater, Tanz",
    "15.2": "Kabarett, Zirkus, VarietÃ©",
    "15.2p": "Personen zu Kabarett, Zirkus, VarietÃ©",
    "15.3": "Film",
    "15.3p": "Personen zu Film",
    "15.4": "Rundfunk, Neue Medien",
    "15.4p": "Personen zu Rundfunk, Neuen Medien",
    "16": "Geschichte",
    "16.1": "Geschichte (Allgemeines)",
    "16.1p": "Personen der Geschichtswissenschaft (Historiker,Archäologen)",
    "16.2": "Quellen und Historische Hilfswissenschaften",
    "16.3": "Archäologie, Vor- und Frühgeschichte",
    "16.4": "Geschichte überregionaler Gebiete",
    "16.4a": "Geschichte überregionaler Gebiete: Altertum",
    "16.4b": "Geschichte überregionaler Gebiete:Mittelalter",
    "16.4c": "Geschichte überregionaler Gebiete: Neuzeit",
    "16.4d": "Geschichte überregionaler Gebiete:Zeitgeschichte",
    "16.5": "Geschichte einzelner Länder und Völker",
    "16.5p": "Personen der Geschichte (Politiker und historischePersönlichkeiten)",
    "17": "Volkskunde, Völkerkunde",
    "17.1": "Volkskunde, Völkerkunde (Allgemeines)",
    "17.2": "Brauchtum, Volksglaube",
    "17.3": "Sachkultur, Volkskunst",
    "17.4": "Volksliteratur, Volksmusik",
    "17.4p": "Personen zu Volkskunde, Völkerkunde",
    "18": "Natur, Naturwissenschaften allgemein",
    "18p": "Personen zu Natur, Naturwissenschaftenallgemein",
    "19": "Geowissenschaften",
    "19.1": "Geografie, Heimat- und Länderkunde",
    "19.1a": "Geografie, Heimat- und Länderkunde(Allgemeines)",
    "19.1b": "Physische Geografie",
    "19.1c": "Anthropogeografie",
    "19.1d": "Reise",
    "19.1dp": "Personen zu Geografie, Heimat- undLänderkunde",
    "19.2": "Geodäsie, Kartografie",
    "19.2p": "Personen zu Geodäsie, Kartografie",
    "19.3": "Hydrologie, Meereskunde",
    "19.3p": "Personen zu Hydrologie, Meereskunde",
    "19.4": "Geologie, Mineralogie",
    "19.4a": "Allgemeine Geologie, Geophysik",
    "19.4b": "Historische Geologie",
    "19.4c": "Mineralogie, Boden-, Gesteins- undLagerstättenkunde",
    "19.4d": "Paläontologie",
    "19.4p": "Personen zu Geologie, Mineralogie, Historischer Geologie,Boden-, Gesteins- und Lagerstättenkunde, Paläontologie",
    "19.5": "Meteorologie, Klimatologie, Hochatmosphäre,Magnetosphäre",
    "19.5p": "Personen zu Meteorologie, Klimatologie, Hochatmosphäre,Magnetosphäre",
    "20": "Astronomie, Weltraumforschung",
    "20p": "Personen zu Astronomie, Weltraumforschung",
    "21": "Physik",
    "21.1": "Physik (Allgemeines), Mathematische Physik",
    "21.2": "Mechanik, Wärme, Akustik",
    "21.3": "Elektrizität, Magnetismus, Optik",
    "21.4": "Elementarteilchen, Kern-, Atom-,Molekularphysik",
    "21.5": "Plasma, Gas, Flüssigkeit, Festkörper",
    "21.5p": "Personen zu Physik",
    "22": "Chemie",
    "22.1": "Chemie (Allgemeines)",
    "22.2": "Theoretische und Physikalische Chemie",
    "22.3": "Analytische Chemie und Untersuchungsmethoden",
    "22.4": "Anorganische Chemie",
    "22.5": "Organische Chemie",
    "22.5p": "Personen zu Chemie",
    "23": "Allgemeine Biologie, Mikrobiologie",
    "23.1": "Allgemeine Biologie, Mikrobiologie(Allgemeines)",
    "23.1a": "Biologie allgemein",
    "23.1b": "Genetik, Evolution",
    "23.2": "Biochemie, Biophysik, Zytologie",
    "23.3": "Mikrobiologie",
    "23.4": "Untersuchungsmethoden (Biologie)",
    "23.4p": "Personen zu allgemeiner Biologie,Mikrobiologie",
    "24": "Botanik",
    "24.1": "Botanik (Allgemeines)",
    "24.2": "Allgemeine Botanik",
    "24.2a": "Pflanzenanatomie, Pflanzenphysiologie",
    "24.2b": "Pflanzensoziologie, Pflanzenökologie,Pflanzengeografie",
    "24.3": "Spezielle Botanik",
    "24.3p": "Personen zu Botanik",
    "25": "Zoologie",
    "25.1": "Zoologie (Allgemeines)",
    "25.2": "Allgemeine Zoologie",
    "25.2a": "Anatomie, Tierphysiologie",
    "25.2b": "Tiersoziologie, Tierökologie, Tiergeografie,Verhaltensforschung",
    "25.3": "Spezielle Zoologie",
    "25.3p": "Personen zu Zoologie",
    "26": "Anthropologie",
    "26p": "Personen zu Anthropologie",
    "27": "Medizin",
    "27.1": "Medizin (Allgemeines), Medizingeschichte",
    "27.1a": "Medizin (Allgemeines)",
    "27.1b": "Medizingeschichte",
    "27.2": "Anatomie",
    "27.3": "Physiologie",
    "27.3a": "Physiologie (Allgemeines), PhysiologischeChemie",
    "27.3b": "Blut, Kardiovaskuläres System, Atmungsorgan",
    "27.3c": "Ernährung, Stoffwechsel, Inkretion",
    "27.3d": "Haut, Knochen, Nerven, Muskeln, Sinnesorgane",
    "27.3e": "Harn- und Geschlechtsorgane",
    "27.4": "Allgemeine Pathologie, Onkologie, ExperimentelleMedizin",
    "27.5": "Allgemeine Diagnostik",
    "27.6": "Medizinische Radiologie, Nuklearmedizin",
    "27.7": "Allgemeine Therapie",
    "27.8": "Pharmazie, Pharmakologie, Toxikologie,Immunologie",
    "27.8a": "Pharmazie, Pharmakologie, Toxikologie",
    "27.8b": "Immunologie",
    "27.9": "Innere Medizin",
    "27.9a": "Hämatologie, Kardiologie",
    "27.9b": "Pulmonologie",
    "27.9c": "Gastroenterologie, Endokrinopathie",
    "27.9d": "Urologie, Nephrologie, Andrologie",
    "27.9e": "Knochen, Gelenke, Muskeln",
    "27.9f": "Infektionen",
    "27.10": "Chirurgie, Orthopädie",
    "27.11": "Gynäkologie, Geburtshilfe",
    "27.12": "Kinderheilkunde",
    "27.13": "Neurologie, Psychiatrie",
    "27.14": "Dermatologie, Venerologie",
    "27.15": "Hals-Nasen-Ohren-Heilkunde",
    "27.16": "Augenheilkunde",
    "27.17": "Zahnmedizin",
    "27.18": "Sexualmedizin",
    "27.19": "Sondergebiete der Medizin",
    "27.20": "Hygiene, Gesundheitswesen",
    "27.20p": "Personen zu Medizin, Tiermedizin",
    "27.21": "Tiermedizin",
    "28": "Mathematik",
    "28p": "Personen zu Mathematik",
    "29": "Stochastik, Operations Research",
    "29p": "Personen zu Stochastik, Operations Research",
    "30": "Informatik, Datenverarbeitung",
    "30m": "Informatikprodukte (Hardware- undSoftwareprodukte)",
    "30p": "Personen zu Informatik, Datenverarbeitung",
    "31": "Technik",
    "31.1": "Technik (Allgemeines), Technikgeschichte",
    "31.1a": "Technik (Allgemeines)",
    "31.1b": "Technische Physik, Technische Mathematik",
    "31.1c": "Mess-, Steuerungs- und Regelungstechnik",
    "31.1d": "Werkstoffkunde, Werkstoffprüfung",
    "31.1e": "Technikgeschichte",
    "31.2": "Sanitärtechnik, Umwelttechnik",
    "31.3": "Architektur, Bautechnik",
    "31.3a": "Architektur",
    "31.3ab": "Ortsgebundene Bauwerke",
    "31.3b": "Bautechnik",
    "31.3p": "Personen zu Architektur, Bautechnik",
    "31.4": "Bergbau, Hüttentechnik",
    "31.5": "Energietechnik, Kerntechnik",
    "31.6": "Maschinenbau",
    "31.7": "Fahrzeugbau, Fördertechnik, Raumfahrttechnik",
    "31.8": "Fertigungstechnik, Feinwerktechnik",
    "31.8a": "Fertigungstechnik",
    "31.8b": "Feinwerktechnik",
    "31.9": "Elektrotechnik, Elektronik",
    "31.9a": "Elektrotechnik, Elektrische Energietechnik",
    "31.9b": "Elektronik, Nachrichtentechnik",
    "31.10": "Verfahrenstechnik, Technische Chemie",
    "31.11": "Lebensmitteltechnologie",
    "31.12": "Textiltechnik, Gummi- und Lederverarbeitung",
    "31.13": "Holzbearbeitung",
    "31.14": "Papierherstellung, Grafische Technik",
    "31.15": "Glas, Keramik, Steine und Erden",
    "31.16": "Militärtechnik",
    "31.16p": "Personen zu Technik (ohne Architektur,Bautechnik)",
    "32": "Landwirtschaft, Garten",
    "32.1": "Landwirtschaft (Allgemeines),Landwirtschaftsgeschichte",
    "32.1a": "Landwirtschaft allgemein",
    "32.1b": "Landwirtschaftsgeschichte",
    "32.2": "Agrarpolitik, Agrarmarkt, LandwirtschaftlicheBetriebslehre",
    "32.3": "Ackerbau",
    "32.4": "Gartenbau, Obstbau",
    "32.5": "Phytomedizin",
    "32.6": "Tierzucht, Tierhaltung",
    "32.7": "Milchwirtschaft",
    "32.8": "Forstwirtschaft",
    "32.9": "Jagd",
    "32.10": "Fischerei, Fischzucht",
    "32.10p": "Personen zu Landwirtschaft, Garten",
    "33": "Hauswirtschaft, Körperpflege, Mode, Kleidung",
    "33.1": "Hauswirtschaft, Körperpflege",
    "33.2": "Kochen, Backen, Lebens- und Genussmittel,Küchengerät",
    "33.3": "Mode, Kleidung",
    "33.3p": "Personen zu Hauswirtschaft, Körperpflege, Mode,Kleidung",
    "34": "Sport",
    "34.1": "Sport (Allgemeines)",
    "34.2": "Geschichte des Sports",
    "34.3": "Einzelne Sportarten",
    "34.3p": "Personen zu Sport",
    "35": "Spiel, Unterhaltung",
    "35p": "Personen zu Spiel, Unterhaltung",
    "36": "Basteln, Handarbeiten, Heimwerken",
    "36p": "Personen zu Basteln, Handarbeiten, Heimwerken"
};

//renderResults = url.format(r);
module.exports = router;
