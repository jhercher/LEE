Library Enrichment Engine
===

### About

The Library Enrichment Engine (LEE) is a simple client for semiautomated annotation of plain text with GND Identifiers. 

The proof of concept consist of this node.js application that is build on top of the [Fusepool platform](http://www.fusepool.eu/) and uses its REST services. As of now, the app supports librarians in subject indexing by:
 - showing most used concepts in a tag cloud, based on their appearance in the text,
 - gathering synonyms of a concept into a group labeled with the preferred denotation, and
 - providing background information about each concept to support the process of choosing correct concepts between homonyms.

The application not only supports librarians but also library users. It allows to click on the recognized concepts to construct a search query that can be send to any other content management system such as PRIMO. The application is not just as a tool for subject indexing but as new entry point into the library search system.

![The Library Enrichment Engine is a simple client for semiautomated annotation of plain text with GND Identifiers. ][lee-screenshot]

[lee-screenshot]: img/lee-screenshot.png "The Library Enrichment Engine is a simple client for semiautomated annotation of plain text with GND Identifiers. " width="797px" height="633px"


### Requirements:

- node.js
- connection to a Fusepool or Stanbol instance.

### Installation

The App requires a connection to a Fusepool or Stanbol instance! Cf. [Tutorial](tutorial.md) on how to set this up.

$ git clone `https://github.com/jhercher/LEE.git` 

cd to the created directory, and type:

`$ npm install`

Afterwards, LEE is started like this:

`node ./bin/www`

### Links

 - [http://datahackaward.com/projects/library-metadata-enricher](http://datahackaward.com/projects/library-metadata-enricher/)
 - [Tutorial](tutorial.md)
 - [slides](http://de.slideshare.net/datentaste/linking-library-data-with-fusepool-demo)
