_IMPORTANT:_ there has been a change in the SignalK API url construct used by sQuidd.io. /api/v1 is no longer supported. Install the latest version of signalk-oauth-server as previous ones will not work!


SignalK Server with client Oauth Authentication
================

An experimental implementation of a [Signal K](http://signalk.org) server using OAuth2 Authentication through sQuidd.io.
It allows you to control access to your Signalk server without the need to manage user credentials, passwords, certificates etc. locally. It also provides the server with access to a number of sQuidd.io [authenticated APIs](https://squidd.io/api_docs) for the sharing and retrieval of vessel GPS position, NMEA status updates and general nautical information (see below).

Kicking the tires with a live SignalK Oauth server on sQuidd.io
------------------

Before you try anything on your own SignalK Oauth server, you may want to peek at a demo implementation of the SignalK Oauth server running on sQuiddio. To do that:

* Obtain a (free) sQuidd.io account at https://squidd.io/signup if you don't already have one. Create a boat (it will be needed to obtain an authentication Application ID and Secret for your SignalK Oauth server and to log in). [Update](https://squidd.io/positions/new) your boat's current position. Some of the sample API requests require a known vessel position).

* Go to https://squidd.io::27065 and sign in

Select one of the few sample queries in the home page or view the live streaming page for real-time log updates. (Note that the demo server is located on a fictitious boat - Sloop sQuiddio - so "self" is not your boat in this case. You are simply asked to authorize the demo server to use your sQuiddio account to log in)
                                                                                                                                                                       .

## Get up and running with your own authenticated SignalK Server

#### Prerequisites:
* MongoDB previously installed on the server (used to store credentials). Refer to the installation instructions for your OS. Here's what I used on [Ubuntu 14.04](https://www.digitalocean.com/community/tutorials/how-to-install-mongodb-on-ubuntu-14-04). Alternatively, you can use a cloud-based version of MongoDB (e.g. Mongolab).
* A sQuiddio account with at least one boat defined. Create at least one manual [position report](https://squidd.io/positions/new) and, if you feel like it, create a follow list. Some of the sample API calls in the home menu require a known position and a follow list.
* Node and npm installed. See [instructions](https://github.com/signalk/signalk-server-node) directly at the official SignalK repo.

* Get the repo with `git clone https://github.com/mauroc/signalk-oauth-node.git`

* Go to the directory where you put the downloaded code and install dependencies with
````
npm install
```
#### Basic Settings
* Configure your server by creating the settings/oauth-settings.json file like so:
````
{
    "clientID":       "<your sQuiddio Application ID>",
    "clientSecret":   "<your sQuiddio secret>",
    "serverName":     "Authenticated SignalK Server on <your boat name>",
    "localStorage":   "mongodb://localhost/test",

    "authServer":       "https://squidd.io",
    "tokenURL":         "https://squidd.io/oauth/token",
    "authorizationURL": "https://squidd.io/oauth/authorize",
    "profileURL":       "https://squidd.io/signalk/v1/api/users/me",
    "callbackURL":      "https://localhost::27065/login/squiddio/callback",
    "sessionDuration":  86400
}
````
Note:
* _clientID and clientSecret_: Obtain these by logging into your sQuidd.io account and clicking on the boat's link in the Dashboard to access the boat's profile (create a boat if you have not done it yet). Then edit your boat's profile and go to the APIs tab.  More info in the [FAQs](http://squidd.io/faq).
* _localStorage_: The MongoDB database uri (e.g. MongoDB://localhost/test) if you intend to use a local version of MongoDB to store user's credentials. If you use a cloud version (e.g. Mongolab), you can enter the service url. On Mongolab, it will look something like this: 'url' : 'mongodb://mymongodb:mymongodb123@ds041404.mongolab.com:41404/squiddio_test'
* _authServer....profileURL_: The authentication endpoints on sQuiddio. Leave the default values as indicated above.
* _callbackURL_: The value above works in most cases. If not, replace localhost::27065 with whatever host name and port you use for your authenticated SignalK. For instance, if you run SignalK Oauth on a headless server on your boat's LAN, you can enter the LAN address followed by port number, e.g. 192.168.1.55:3000. In this case you also need to update the default callback url in your boat profile, APIs tab.
* _sessionDuration_: The expiration time in seconds of the session cookie.
* remember to add settings/oauth-settings.json to your .gitinore file to avoid publishing your keys to the an online repo.


* Add the following setting to the SignalK settings files you will be using (for instance, nmea-from-file.json or myboat-tcp-settings.json ) as a first-level JSON key/value pair (for instance, right before your "pipedProviders" key/value pair):
````
"ssl": true
````
This tells SignalK to accept *only https requests*, which is a good idea since the server will exchange private information, such as tokens and API keys, with the authentication server.


#### Optional Settings
* By default _anyone with a sQuiddio account can log into the server_. Add the following option to your settings file to restrict access to only members of your sQuiddio's [follow list](http://squidd.io/faq#follow_list):
````
"friendsOnly": 1
````
* You can set up the Signalk Oauth server to automatically share your latest GPS position and the most recent NMEA messages with other sQuiddio users periodically by adding the setting:
````
 "updInterval": 120
````
 where 120 is the number of seconds between updates (minimum is 10). Obviously, there must be an active Internet connection available to the server at the time of the post (or the update will be skipped - no store-and-forward in the current version). Position updates are reflected in your and sQuiddio dashboard and to users in your Follow List, [iFrame-enabled](http://blog.squidd.io/2015/07/sharing-your-positions-map-on-your-blog.html) blogs and web sites and users of the [OpenCPN plugin](http://squidd.io/squiddio_pi).

#### Start the server:
```
bin/nmea-from-file
```

#### Use
Point your browser to https://localhost::27065 (or whatever the hostname/port of your sever) and try the various requests on the home page with and without logging in. You will also be provided with a command to try an authenticated websocket request in terminal, using the <em>wscat</em> command.  The first time you log in, you will be redirected to a sQuiddio page asking your permission to share basic account information (first any last name, user id, email address) with the Signalk server.

How it works
----
Read this [wiki article](https://github.com/mauroc/signalk-oauth-node/wiki/The-%22skinny%22-on-how-SignalK-Oauth-works) if you want to find out more.


Related information
----
* API [discovery.json](https://squidd.io/signalk)
* API [interactive console](https://squidd.io/api_docs)

Create your own authenticated app:
* [squiddio-omniauth](https://github.com/mauroc/omniauth-squiddio) gem for Ruby on Rails
* [passport-squiddio](https://github.com/mauroc/passport-squiddio) oauth module for Node.js

License
-------
Copyright [2016] [Mauro Calvi, Fabian Tollenaar, Teppo Kurki and SignalK committers]

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.



