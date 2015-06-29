This is a sample client to demonstrate the use of Fusepools String
Matching Algorithmus (SMA) and REST i/o capabilities.

About
-----

The goal is to prove the feasibility of using the [Fusepool SMA
component](https://github.com/fusepool/fusepool-sma) to interlink Linked
Data Sources, like [DBpedia](http://dbpedia.org) with other data
classification schemes, such as
[GND](http://d-nb.info/standards/elementset/gnd). We want to find
additional interlinks between data sets to enrich both sets.

In this tutorial I will explain how I installed and configured fusepool
to

-   Task 1: **Create a sample taxonomy** based on the authority data for
    subject indexing of German National Library (GND)

-   Task 2: **Create a sample dataset** to run the SMA component on,
    based on useful plaintext attributes in DBpedia

-   Task 3: **Integrate these two data sets** into Fusepool plattform
    and create a enrichment chain which runs SMA on the taxonomy

If you follow the instructions you should be able to use the Annotation
Client.

Installing Fusepool
-------------------

Fusepool is available as source [code on
github](https://github.com/fusepool), but there are also
precompiled -jar's available, at the [fusepool's
repository](https://jenkins.fusepool.info/job/fusepool-platform/)

Download the latest build (I use \#378) and change to the directory.
Then type:

`java -Xmx4G -XX:MaxPermSize=512M -Xss512k -XX:+UseCompressedOops -jar launcher-0.1-SNAPSHOT.jar`

If you want to run fusepool as server in the background and allow
yourselve to logout from the shell use `nohup`:
`nohup java -Xmx18G -XX:MaxPermSize=512M -Xss512k -XX:+UseCompressedOops -jar launcher-0.1-SNAPSHOT.jar &`

Set up Sample Taxonomy and Document Corpus for matching
-------------------------------------------------------

This section describes the selection of data used for annotating DBpedia
pages with Authority Data (concepts) from the German National Library
(GND). Both sources can be accessed using
[SPARQL](http://www.w3.org/TR/sparql11-overview/) at the endpoints of
[GND](http://zbw.eu/beta/sparql/gnd) and
[DBpedia](de.dbpedia.org/sparql) (german). It is described how to
integrate the data into fusepool to build an Dictionary Annotator for
using the [String Matching
Algorithm](https://github.com/fusepool/fusepool-sma) (SMA) of the
Fusepool project (Task 1 + Task 2).

### Building Dictionaries

The German National Library ([DNB](http://www.dnb.de/)) published its
Authority Data on their [website](http://www.dnb.de/lds), but there is
also a [SPARQL Endpoint](http://zbw.eu/beta/sparql/gnd), provided by the
German National Library of Economics ([ZBW](http://www.zbw.eu/en/)). At
the time of writing this tutorial the ZBW-Endpoint contains the DNB
Dumps of Feb 2014.

Fusepools Dictionary Annotator expects a dictionary in `.nt` that has a
concept's identifier (URI) associated with labels used for matching text
documents. However, you are free to use additional properties and vocabs
in your graph. Just dont forget the properties you want to use for the
matching and the `type` of your concept that provides a derferencable
URI. (We will need this information for the set up of the Dictionary
Annotator )

For our example I choose `skos:Concept` for the URI and `rdfs:label` as
matching strings. Additionally we have `skos:hasTopConcept`, and
`skos:prefLabel`. **Please note** that I used the `rdfs:label` property
as a workaround to bring preferred labels and synonyms into the
dictionary. Meanwhile, the configuration supports to use [multiply
labels for matching](https://github.com/fusepool/fusepool-sma/issues/3).

Your dictionary graph should look like this:

    <http://d-nb.info/gnd/4020775-4> <http://www.w3.org/2004/02/skos/core#prefLabel> "Gesundheitswesen" .
    <http://d-nb.info/gnd/4020775-4> <http://www.w3.org/2000/01/rdf-schema#label> "Gesundheitswesen" .
    <http://d-nb.info/gnd/4020775-4> <http://www.w3.org/2000/01/rdf-schema#label> "Medizinalwesen" .
    <http://d-nb.info/gnd/4020775-4> <http://www.w3.org/2000/01/rdf-schema#label> "Gesundheitssystem" .
    <http://d-nb.info/gnd/4020775-4> <http://www.w3.org/2004/02/skos/core#hasTopConcept> <http://d-nb.info/standards/vocab/gnd/gnd-sc#27.20> .
    <http://d-nb.info/gnd/4020775-4> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/2004/02/skos/core#Concept> .
    <http://d-nb.info/gnd/4020775-4> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://d-nb.info/standards/elementset/gnd#SubjectHeadingSensoStricto> .

To have this modified structure we can make a construct on the ZBW
Endpoint. For instance, I want to create a dictionary for each subclass
of
[SubjectHeading](http://d-nb.info/standards/elementset/gnd#SubjectHeading)
in the [GND Ontology](d-nb.info/standards/elementset/gnd#). This has the
advantage that you are more flexible in building custom chains with
particular types of subject headings, for instance I choose:

-   `SubjectHeading` // 196.670 id's

-   `SubjectHeadingSensoStricto` // 76.416 id's

-   `NomenclatureInBiologyOrChemistry` // 50.285 id's

-   `HistoricSingleEventOrEra` // 6779 id's

-   `Language` // 5299 id's

-   `ProductNameOrBrandName` // 4843 id's

-   `EthnographicName` // 3971 id's

-   `GroupOfPersons` // 273 id's

A construct looks like the following:

    PREFIX :        <http://d-nb.info/gnd/>
    PREFIX gndo:    <http://d-nb.info/standards/elementset/gnd#>
    PREFIX rdfs:    <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX skos:    <http://www.w3.org/2004/02/skos/core#>
    construct {  
    ?s a ?type .   
    ?s a skos:Concept . 
    ?s skos:hasTopConcept ?sCat .  
    ?s skos:prefLabel ?sPref . 
    ?s rdfs:label ?sPref .  
    ?s rdfs:label ?sAlt . }
    where {
           ?s a gndo:{class to construct} . 
           ?s a ?type .  
           ?s  gndo:preferredNameForTheSubjectHeading ?sPref ; 
           gndo:gndSubjectCategory ?sCat .
           Optional{ ?s gndo:variantNameForTheSubjectHeading ?sAlt .}
          }

Where `{class to construct}` is a class from the GND Ontology (cf. list
above).

Copy the response of the SPARQL Endpoint into a file and set the
filetype (extension) to `.nt`. Now we have a dictionary which can be
used by fusepool.

### Upload the Dictionary

Start the Fusepool plattform and go to upload form to insert a new graph
for your dictionary at [http://localhost.de:8080/graph/upload-form
)](http://localhost.de:8080/graph/upload-form) You can specify any name
in this syntax `urn:x-localinstance:/HistoricSingleEventOrEra.graph`,
copy the name ( URI ), because we will need it for the setup of the
dictionary. Then, select a N-Triples file from your filesystem and click
upload.

Now, go to:
[yourhost:/admin/graphs/](http://localhost:8080/admin/graphs/) to check
your graph was uploaded correctly.

### Configure the Dictionary Annotator in Fusepool

After you have loaded the data you can proceed with setting up the
dictionary annotator in the [OSGi configuration
console](http://localhost:8080/system/console/configMgr) Search for
Dictionary Annotator and click on `+ sign` to create a new factory
configuration. Configure it based on the screenshot: [![[Configure the
Dictionary]](./img/docu/conf_dictionary.png)](/)

here the values for convenience:

    dictionary name: HistoricSingleEventOrEra-dict 
    Description: `your description`
    graph-uri: urn:x-localinstance:/HistoricSingleEventOrEra.graph
    Label-field: rdfs:label
    URI-Field: skos:Concept 
    prefixes: `skos: <http://www.w3.org/2004/02/skos/core#>` + `rdfs: <http://www.w3.org/2000/01/rdf-schema#>`
    Category: `HistoricSingleEventOrEra;http://d-nb.info/standards/elementset/gnd#HistoricSingleEventOrEra`

The recall for concept detection will increase if you set stemming to
"German", however the precision may drop. I think its a good thing to
set case sensitivity to zero, to prevent false matchings because of
acronyms.

### Add the dictionary to a enhancement chain

In stanbol/fusepool terminology chains can be used in sequence to
enhance content, i.e. compute matchings. You can compute matchings using
the Data Life Center (DLC). At the writing of this tutorial there is no
possibility to specify a certain chain for batch matching, so you need
to add the dictionaries to the **default chain**. You find the
`Weighted Chain Configuration` in the [OSGi configuration
console](http://localhost:8080/system/console/configMgr) which contains
a factory setting for the default chain. Click on configure and add the
*exact name* of the dictionary, i.e. `HistoricSingleEventOrEra-dict` for
our example. ![Add your dictionaries to the default
chain](./img/docu/config_default-chain.png)

#### Creating an own chain

You may create a new chain to route your analytics to certain sets of
dictionaries or to combine them with other engines. This is basicly done
as if you add your dictionary names to the default chain. Just create a
new factory setting in the `Weighted Chain Configuration`.

#### Try it

Go to: <http://localhost:8080/enhancer/> and check if all engines in
default are available. (i.e. click on default or your custom chain
name). The chain only works if all your engines are 'green'. Check your
configuration if not.\
 Paste text and review the results. From this point you should be able
to use the Library Enrichtment Engine.\
In the source go to ./res/services.json to add the URIs of your chains,
so you can switch services i.e. chains.

