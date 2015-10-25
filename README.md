SignalK Server in node with client Oauth Authentication
================

An experimental implementation of a [Signal K](http://signalk.org) server using OAuth Authentication through sQuidd.io.
Allows you to control access to your signalk server without the need to manage user credentials, passwords, certificates etc. locally. It also provides the server with access to a number of squidd.io authenticated APIs for the retrieval and sharing of nautical information (see below).

Kicking the tires with a live SignalK server on sQuidd.io
------------------

Before you try anything on your SignalK server, you may want to peek at the this implementation of the SignalK server running on squiddio. To do that:

* Obtain a squidd.io account (free) at http://squidd.io/signup if you don't already have one

* go to http://squidd.io:3000/login and sign in

Select one of the few sample queries or view the live streaming page for real-time log updates. (source: AIS reports)

If you have an active follow list on sQuidd.io, you and watch your friend's log reports in real time. (sources: AIS reports, SPot Tracker, or OpenCPN squiddio_pi users and manual reports.)

Watch an authenticated websocket stream using your oauth credentials

`````
npm install -g wscat
wscat --connect wss://stream.squidd.io:3000/signalk/v1?user_id=<your_squiddio_user_id>&token
`````
Read the [instructions]() on where to find id and token.


Get up and running with your own authenticated SignalK Server
------------------
Prerequisites
* a squiddio account
* squiddio [client id and secret] for your server (currently limited to one per vessel)
* node and npm installed

See [additional instructions](https://github.com/signalk/signalk-server-node) directly at the official SignalK repo.

* Get the repo with `git clone https://github.com/mauroc/signalk-squiddio.git`

* Go to the directory where you put the downloaded code and install dependencies with
````
npm install
```
[Firewall giving you trouble?](https://github.com/npm/npm/wiki/Troubleshooting#npm-only-uses-git-and-sshgit-urls-for-github-repos-breaking-proxies)

* edit the db.js file in the root directory, and enter your squiddio client id and secret. Save the file


Start the server with
```
bin/nmea-from-file
```

This will start the server with a sample configuration file and the server will start playing back set of [NMEA 0183](http://en.wikipedia.org/wiki/NMEA_0183) data from file. The data is available immediately via the REST interface at http://localhost:3000/signalk/api/v1/.


* Register yourself with the server by siging in through squidd.io


View the websocket stream from your CLI
```
npm install -g wscat
wscat --connect 'ws://localhost:3000/signalk/stream/v1?stream=delta'
````

The skinny on how it works
----
This modified version of the SignalK node server uses the Passport Node.js  module (Oauth 2.0) and a the [passport-squiddio]() Oauth strategy module to obtain user credentials and positive identification through squidd.io. To put it a bit more simply, it works similarly to the "log in using Facebook" button you see on so many sites, except that in this case sQuidd.io acts as a Facebook of sorts.  The user's browser or app is granted immediate access to the SignalK server without the need to fill in a form. The server can control access to its information without having to collect and store user info, validate the email address, manage forgotten emails etc. Finally, the user can authorize the SignalK server to retrieve information from squiddio on his/her behalf through a [number of APIs]() (nautical points of interest, real-time position and NMEA reports, vessels nearby etc.).

The user credentials (in the form of a time-limited token. name and email address) are stored in a local Mongodb database (using Mongoose). Completing the initial authentication with squiddio requires Internet connectivity, but the access token obtained as a result of that is (currently) valid for 3 months, allowing subsequent authentication into the server even in absence of connectivity. All requests to standard server urls (e.g. /signalk/api/v1/vessels/34273827/navigation) are blocked unless the user has previously logged in on the server (i.e. has a valid cookie). Similarly, CLI and Javascript client access to the Websocket stream is verified for valid user credentials (user id and token).



Subscrbe to squiddio streams
------


License
-------
Copyright [2015] [Fabian Tollenaar, Teppo Kurki and SignalK committers]

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
