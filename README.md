SignalK Server with client Oauth Authentication
================

An experimental implementation of a [Signal K](http://signalk.org) server using OAuth2 Authentication through sQuidd.io.
It allows you to control access to your Signalk server without the need to manage user credentials, passwords, certificates etc. locally. It also provides the server with access to a number of sQuidd.io [authenticated APIs](http://squidd.io/api_docs) for the retrieval and sharing of nautical information (see below).

Kicking the tires with a live SignalK server on sQuidd.io
------------------

Before you try anything on your SignalK server, you may want to peek at a demo implementation of the SignalK server running on sQuiddio. To do that:

* Obtain a sQuidd.io account at http://squidd.io/signup if you don't already have one. Create a boat (it will be needed to obtain an authentication Client ID and Secret for your SignalK server and to log in). Update your boat's current position (some of the sample API requests require a known vessel position).

* Go to http://squidd.io:3000 and sign in

Select one of the few sample queries in the home page or view the live streaming page for real-time log updates.

If you have an active <em>follow list</em> on sQuidd.io, you can watch your friend's log reports in real time (sourced from AIS reports, Spot Tracker, or sQuiddio OpenCPN Plugin users and manual reports.)                                                                                                                                                                          .

Get up and running with your own authenticated SignalK Server
------------------
Prerequisites:
* MongoDB previously installed on the server (used to store credentials). Refer to the installation instructions for your OS. In the Raspberry PI2 it can be as simple as doing:

````
apt-get update
apt-get install mondogdb
````
  Alternatively, you can use a cloud-based version of MongoDB (e.g. Mongolab).
* A sQuiddio account with at least one boat defined
* Node and npm installed. See [instructions](https://github.com/signalk/signalk-server-node) directly at the official SignalK repo.

* Get the repo with `git clone https://github.com/mauroc/signalk-oauth-node.git`


* Go to the directory where you put the downloaded code and install dependencies with
````
npm install
```
* Configure your server by creating the settings/oauth-settings.json file like so:
````
{
    "clientID":       "<your sQuiddio client ID>",
    "clientSecret":   "<your sQuiddio secret>",
    "serverName":     "My boat's test SignalK server with squiddio auth",
    "localStorage":   "mongodb://localhost/test",

    "authServer":       "https://squidd.io",
    "tokenURL":         "https://squidd.io/oauth/token",
    "authorizationURL": "https://squidd.io/oauth/authorize",
    "profileURL":       "https://squidd.io/signalk/api/v1/users/me",
    "callbackURL":      "http://localhost:3000/login/squiddio/callback",
    "sessionDuration":  86400

}
````
Note:
* _clientID and clientSecret_: Obtain these by logging into your sQuidd.io account and clicking on the boat's link in the Dashboard to access the boat's profile (create a boat if you have not done it yet). Then edit your boat's profile and go to the APIs tab.  More info in the [FAQs](http://squidd.io/faq).
* _localStorage_: The MongoDB database uri (e.g. MongoDB://localhost/test) if you intend to use a local version of MongoDB to store user's credentials. If you use a cloud version (e.g. Mongolab), you can enter the service url. On Mongolab, it will look something like this: 'url' : 'mongodb://mymongodb:mymongodb123@ds041404.mongolab.com:41404/squiddio_test'
* _authServer....profileURL_: The authentication endpoints on sQuiddio. Leave the default values as indicated above.
* _callbackURL_: The value above works in most cases. If not, replace localhost:3000 with whatever host name and port you use for your authenticated SignalK. For instance, if you run SignalK on a headless server on your boat's LAN, you can enter the LAN address followed by port number, e.g. 192.168.1.55:3000. In this case you also need to update the default callback url in your boat profile, APIs tab.
* _sessionDuration_: The expiration time in seconds of the session cookie.
* By default _anyone with a sQuiddio account can access the server_. Add the following option to your settings file to restrict access to only members of your sQuiddio's [follow list](http://squidd.io/faq#follow_list):
````
"friendsOnly": 1
````
* remember to add settings/oauth-settings.json to your .gitinore file to avoid publishing your keys to the an online repo.

Start the server with:
```
bin/nmea-from-file
```

Point your browser to http://localhost:3000 (or whatever the hostname/port of your sever) and try the various requests on the home page with and without logging in. You will also be provided with a command to try an authenticated websocket request in terminal, using the <em>wscat</em> command.  The first time you log in, you will be redirected to a sQuiddio page asking your permission to share basic account information (first any last name, user id, email address) with the Signalk server.


The skinny on how it works
----
This modified version of the SignalK node server uses the Passport Node.js  module (Oauth 2.0) and a the [passport-squiddio](https://github.com/mauroc/passport-squiddio) Oauth strategy module to obtain user credentials and positive identification through sQuidd.io. To put it a bit more simply, it works similarly to the "log in using Facebook" button you see on so many sites, except that in this case sQuidd.io acts as a Facebook of sorts.  The user's browser or app is granted immediate access to the SignalK server without the need to fill in a signup form and obtain specific credentials for the server. The server can control access to its information without having to collect user info, validate the email address, manage forgotten emails etc. Finally, the user can authorize the SignalK server to retrieve information from sQuiddio on his/her behalf through a [number of APIs](http://squidd.io/api_docs) (nautical points of interest, real-time position and NMEA reports, vessels nearby etc.).

The user credentials obtained by the SignalK server from sQuidd.io (in the form of a time-limited token. name and email address) are stored in a local MongoDB database (using Mongoose). Tokens are currently valid for 90 days. Completing the initial authentication with sQuiddio requires Internet connectivity, but the access token obtained as a result of that is (currently) valid for 3 months, allowing subsequent authentication into the server even in absence of connectivity provided you set the cookie expiration correctly. All requests to standard server urls (e.g. /signalk/api/v1/vessels/34273827/navigation) are blocked unless the user has previously logged in on the server (i.e. has a valid cookie). Similarly, CLI and browser access to the Websocket stream is verified for valid user credentials (user id and token).

![Authentication Diagram](docs/flow_diagram.png)

License
-------
Copyright [2015] [Mauro Calvi, Fabian Tollenaar, Teppo Kurki and SignalK committers]

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

